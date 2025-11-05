import { useEffect, useState } from 'react';
import { DocumentData, DocumentSnapshot, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Group, MembershipRequest } from '../types/group';

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
  return {
    id: snapshot.id,
    title: data.title ?? '',
    description: data.description ?? '',
    ownerName: data.ownerName ?? '',
    ownerId: data.ownerId ?? undefined,
    members: sanitizeIdentifiers(data.members),
    organizers: sanitizeIdentifiers(data.organizers),
    bannerImage: data.bannerImage ?? undefined,
    logoImage: data.logoImage ?? undefined,
    createdAt: toIso(data.createdAt),
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
    normalizedTitle: typeof data.normalizedTitle === 'string' ? data.normalizedTitle : undefined
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
