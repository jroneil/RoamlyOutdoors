import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { AppUser, SubscriptionStatus, UserDTO } from '../types/user';
import type { GroupFormValues } from '../types/group';
import {
  computeGroupSubscriptionTransition,
  hasAvailableGroupCapacity,
  normalizeGroupTitle,
  validateOwnershipTransfer,
  type OwnershipTransferBlockReason
} from '../utils/groupRules';

const GROUPS_COLLECTION = 'groups';
const USERS_COLLECTION = 'users';

const sanitizeMembers = (members?: string[]): string[] => {
  if (!Array.isArray(members)) {
    return [];
  }

  const seen = new Set<string>();
  return members
    .map((member) => (typeof member === 'string' ? member.trim() : ''))
    .filter((member) => {
      if (!member) return false;
      const lower = member.toLowerCase();
      if (seen.has(lower)) {
        return false;
      }
      seen.add(lower);
      return true;
    });
};

const sanitizeUrl = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveOwnerName = (values: GroupFormValues, owner: AppUser): string => {
  if (values.ownerName?.trim()) {
    return values.ownerName.trim();
  }

  if (owner.organizationName?.trim()) {
    return owner.organizationName.trim();
  }

  if (owner.displayName?.trim()) {
    return owner.displayName.trim();
  }

  return owner.contactEmail || 'Group owner';
};

export class DuplicateGroupNameError extends Error {
  constructor(message = 'A group with that name already exists.') {
    super(message);
    this.name = 'DuplicateGroupNameError';
  }
}

export class GroupCapacityExceededError extends Error {
  constructor(message = 'Your subscription does not include capacity for another group.') {
    super(message);
    this.name = 'GroupCapacityExceededError';
  }
}

export class InactiveSubscriptionError extends Error {
  constructor(message = 'An active subscription is required to manage groups.') {
    super(message);
    this.name = 'InactiveSubscriptionError';
  }
}

export class OwnershipTransferError extends Error {
  reason?: OwnershipTransferBlockReason;

  constructor(message: string, reason?: OwnershipTransferBlockReason) {
    super(message);
    this.name = 'OwnershipTransferError';
    this.reason = reason;
  }
}

export const getOwnedGroupCount = async (ownerId: string): Promise<number> => {
  const groupsQuery = query(collection(db, GROUPS_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(groupsQuery);
  return snapshot.size;
};

const ensureUniqueGroupTitle = async (normalizedTitle: string) => {
  if (!normalizedTitle) {
    return;
  }

  const existing = await getDocs(
    query(
      collection(db, GROUPS_COLLECTION),
      where('normalizedTitle', '==', normalizedTitle),
      limit(1)
    )
  );

  if (!existing.empty) {
    throw new DuplicateGroupNameError();
  }
};

const assertActiveSubscription = (status: SubscriptionStatus | undefined) => {
  if (status !== 'active') {
    throw new InactiveSubscriptionError();
  }
};

export const createGroupForOwner = async (
  owner: AppUser,
  values: GroupFormValues
): Promise<string> => {
  assertActiveSubscription(owner.billing.subscriptionStatus);

  const normalizedTitle = normalizeGroupTitle(values.title ?? '');
  await ensureUniqueGroupTitle(normalizedTitle);

  const quota = owner.billing.entitlements?.groupQuota ?? 0;
  const currentCount = await getOwnedGroupCount(owner.uid);

  if (!hasAvailableGroupCapacity(quota, currentCount)) {
    throw new GroupCapacityExceededError();
  }

  const members = sanitizeMembers(values.members);
  const now = new Date();
  const transition = computeGroupSubscriptionTransition({
    currentStatus: 'none',
    nextStatus: owner.billing.subscriptionStatus,
    currentExpiredAt: null,
    now
  });

  const monthlyFeeCents = Number.isFinite(values.monthlyFeeCents)
    ? Math.max(0, Math.round(values.monthlyFeeCents))
    : 0;

  const payload = {
    title: values.title.trim(),
    description: values.description?.trim() ?? '',
    ownerName: resolveOwnerName(values, owner),
    ownerId: owner.uid,
    members,
    organizers: [],
    bannerImage: sanitizeUrl(values.bannerImage ?? undefined),
    logoImage: sanitizeUrl(values.logoImage ?? undefined),
    createdAt: serverTimestamp(),
    subscriptionStatus: transition.subscriptionStatus ?? 'none',
    subscriptionExpiredAt: transition.subscriptionExpiredAt ?? null,
    subscriptionRenewedAt: transition.subscriptionRenewedAt ?? null,
    subscriptionUpdatedAt: transition.subscriptionUpdatedAt,
    subscriptionRenewalDate: owner.billing.renewalDate ?? null,
    monthlyFeeCents,
    organizerIds: [],
    membershipScreeningEnabled: Boolean(values.membershipScreeningEnabled),
    membershipRequests: [],
    normalizedTitle
  };

  const docRef = await addDoc(collection(db, GROUPS_COLLECTION), payload);
  return docRef.id;
};

const fetchUserById = async (userId: string): Promise<UserDTO | null> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserDTO;
};

interface OwnershipTransferInput {
  groupId: string;
  newOwnerId: string;
}

export const transferGroupOwnership = async ({
  groupId,
  newOwnerId
}: OwnershipTransferInput): Promise<void> => {
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);

  if (!groupSnapshot.exists()) {
    throw new OwnershipTransferError('Group not found.');
  }

  const groupData = groupSnapshot.data() as Record<string, unknown>;
  const currentOwnerId = typeof groupData.ownerId === 'string' ? groupData.ownerId : undefined;
  const newOwnerData = await fetchUserById(newOwnerId);

  if (!newOwnerData) {
    throw new OwnershipTransferError('The destination owner does not exist.');
  }

  const isSameOwner = currentOwnerId === newOwnerId;
  const quota = newOwnerData.billing?.entitlements?.groupQuota ?? 0;
  const ownedCount = await getOwnedGroupCount(newOwnerId);
  const hasCapacity = isSameOwner ? true : hasAvailableGroupCapacity(quota, ownedCount);
  const targetStatus = newOwnerData.billing?.subscriptionStatus ?? 'none';

  const validation = validateOwnershipTransfer({
    incomingStatus: targetStatus,
    hasCapacity,
    isSameOwner
  });

  if (!validation.allowed) {
    let message = 'Unable to transfer ownership for this group.';
    switch (validation.reason) {
      case 'same_owner':
        message = 'The group is already owned by the selected user.';
        break;
      case 'inactive_subscription':
        message = 'The destination owner must have an active subscription.';
        break;
      case 'capacity_exceeded':
        message = 'The destination owner has reached their group quota.';
        break;
      default:
        break;
    }

    throw new OwnershipTransferError(message, validation.reason);
  }

  const now = new Date();
  const transition = computeGroupSubscriptionTransition({
    currentStatus: (groupData.subscriptionStatus as SubscriptionStatus | undefined) ?? 'none',
    nextStatus: targetStatus,
    currentExpiredAt: (groupData.subscriptionExpiredAt as string | undefined) ?? null,
    now
  });

  const nextOwnerName =
    newOwnerData.organizationName?.trim() ||
    newOwnerData.contactEmail ||
    'Group owner';

  await updateDoc(groupRef, {
    ownerId: newOwnerId,
    ownerName: nextOwnerName,
    subscriptionStatus: transition.subscriptionStatus ?? 'none',
    subscriptionExpiredAt: transition.subscriptionExpiredAt ?? null,
    subscriptionRenewedAt: transition.subscriptionRenewedAt ?? null,
    subscriptionUpdatedAt: transition.subscriptionUpdatedAt,
    subscriptionRenewalDate: newOwnerData.billing?.renewalDate ?? null
  });
};

export type { OwnershipTransferBlockReason } from '../utils/groupRules';
