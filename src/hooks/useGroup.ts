import { useEffect, useState } from 'react';
import { DocumentData, DocumentSnapshot, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Group, GroupMembership, MembershipRequest } from '../types/group';
import { normalizeTagLabel } from '../types/tag';

const toIso = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

const sanitizeIdentifiers = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
};

const buildMemberships = ({
  groupId,
  ownerId,
  ownerName,
  organizerIds,
  members,
  createdAt
}: {
  groupId: string;
  ownerId?: string;
  ownerName: string;
  organizerIds: string[];
  members: string[];
  createdAt: string;
}): GroupMembership[] => {
  const roster = new Map<string, GroupMembership>();

  if (ownerId) {
    roster.set(ownerId, {
      id: `${groupId}:${ownerId}:owner`,
      memberId: ownerId,
      displayName: ownerName || ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: createdAt || null,
      invitedAt: null
    });
  }

  members.forEach((memberId) => {
    const role: GroupMembership['role'] = organizerIds.includes(memberId) ? 'organizer' : 'member';
    const existing = roster.get(memberId);

    if (existing) {
      roster.set(memberId, {
        ...existing,
        role: role === 'organizer' ? 'organizer' : existing.role
      });
      return;
    }

    roster.set(memberId, {
      id: `${groupId}:${memberId}:${role}`,
      memberId,
      displayName: memberId,
      role,
      status: 'active',
      joinedAt: null,
      invitedAt: null
    });
  });

  return Array.from(roster.values());
};

const mapMembershipRequest = (value: unknown): MembershipRequest | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const memberName = typeof raw.memberName === 'string' ? raw.memberName.trim() : '';
  if (!id || !memberName) {
    return null;
  }

  const status = raw.status === 'approved' || raw.status === 'declined' ? raw.status : 'pending';

  return {
    id,
    memberName,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    submittedAt: toIso(raw.submittedAt),
    status
  };
};

const mapSnapshot = (snapshot: DocumentSnapshot<DocumentData>): Group | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const membershipRequests: MembershipRequest[] = Array.isArray(data.membershipRequests)
    ? data.membershipRequests
        .map((request) => mapMembershipRequest(request))
        .filter((request): request is MembershipRequest => Boolean(request))
    : [];
  const organizerIds = sanitizeIdentifiers(data.organizerIds);
  const organizerNames = sanitizeIdentifiers(data.organizers);
  const members = sanitizeIdentifiers(data.members);
  const tagLabels = Array.isArray(data.tags) ? sanitizeIdentifiers(data.tags) : [];
  const createdAt = toIso(data.createdAt);
  const memberships = buildMemberships({
    groupId: snapshot.id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    ownerName: typeof data.ownerName === 'string' ? data.ownerName : '',
    organizerIds,
    members,
    createdAt
  });
  const memberCount = memberships.filter((membership) => membership.status === 'active').length;
  const tags = tagLabels.map((label) => ({
    id: `${snapshot.id}:tag:${normalizeTagLabel(label)}`,
    label,
    normalizedLabel: normalizeTagLabel(label),
    category: undefined
  }));

  return {
    id: snapshot.id,
    title: data.title ?? '',
    description: data.description ?? '',
    ownerName: data.ownerName ?? '',
    ownerId: data.ownerId ?? undefined,
    organizerIds,
    members,
    organizers: organizerNames.length > 0 ? organizerNames : organizerIds,
    bannerImage: data.bannerImage ?? undefined,
    logoImage: data.logoImage ?? undefined,
    createdAt,
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : null,
    subscriptionStatus: data.subscriptionStatus ?? 'none',
    subscriptionExpiredAt: data.subscriptionExpiredAt ? toIso(data.subscriptionExpiredAt) : null,
    subscriptionRenewedAt: data.subscriptionRenewedAt ? toIso(data.subscriptionRenewedAt) : null,
    subscriptionUpdatedAt: data.subscriptionUpdatedAt ? toIso(data.subscriptionUpdatedAt) : null,
    subscriptionRenewalDate: data.subscriptionRenewalDate ? toIso(data.subscriptionRenewalDate) : null,
    monthlyFeeCents:
      typeof data.monthlyFeeCents === 'number' && Number.isFinite(data.monthlyFeeCents)
        ? Math.max(0, Math.round(data.monthlyFeeCents))
        : 0,
    membershipScreeningEnabled: Boolean(data.membershipScreeningEnabled),
    membershipRequests,
    normalizedTitle: typeof data.normalizedTitle === 'string' ? data.normalizedTitle : undefined,
    tags: tags.length > 0 ? tags : undefined,
    tagIds: tags.length > 0 ? tags.map((tag) => tag.normalizedLabel) : undefined,
    memberships,
    memberCount,
    location: null
  } satisfies Group;
};

export const useGroup = (groupId?: string) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const ref = doc(db, 'groups', groupId);
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setGroup(mapSnapshot(snapshot));
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId]);

  return { group, isLoading, error };
};
