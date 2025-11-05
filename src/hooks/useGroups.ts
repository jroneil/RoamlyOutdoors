import { useEffect, useMemo, useState } from 'react';
import {
  DocumentData,
  QuerySnapshot,
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Group, MembershipRequest } from '../types/group';

const mapMembershipRequest = (value: unknown, toIso: (input: unknown) => string): MembershipRequest | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const status = raw.status === 'approved' || raw.status === 'declined' ? raw.status : 'pending';

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const memberName = typeof raw.memberName === 'string' ? raw.memberName.trim() : '';

  if (!id || !memberName) {
    return null;
  }

  return {
    id,
    memberName,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    submittedAt: toIso(raw.submittedAt),
    status
  };
};

const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): Group[] =>
  snapshot.docs.map((doc) => {
    const data = doc.data();
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

    const membershipRequests: MembershipRequest[] = Array.isArray(data.membershipRequests)
      ? data.membershipRequests
          .map((request) => mapMembershipRequest(request, toIso))
          .filter((request): request is MembershipRequest => Boolean(request))
      : [];

    return {
      id: doc.id,
      title: data.title ?? '',
      description: data.description ?? '',
      ownerName: data.ownerName ?? '',
      ownerId: data.ownerId ?? undefined,
      organizerIds: Array.isArray(data.organizerIds)
        ? data.organizerIds.filter((value) => typeof value === 'string')
        : [],
      members: Array.isArray(data.members) ? data.members : [],
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
  });

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const groupsQuery = query(collection(db, 'groups'), orderBy('title', 'asc'));

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        setGroups(mapSnapshot(snapshot));
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const totalMembers = useMemo(() => {
    return groups.reduce((acc, group) => acc + group.members.length, 0);
  }, [groups]);

  return { groups, isLoading, error, totalMembers };
};
