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
import type { Group } from '../types/group';

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

    return {
      id: doc.id,
      title: data.title ?? '',
      description: data.description ?? '',
      ownerName: data.ownerName ?? '',
      ownerId: data.ownerId ?? undefined,
      members: Array.isArray(data.members) ? data.members : [],
      bannerImage: data.bannerImage ?? undefined,
      logoImage: data.logoImage ?? undefined,
      createdAt: toIso(data.createdAt),
      subscriptionStatus: data.subscriptionStatus ?? 'none',
      subscriptionExpiredAt: data.subscriptionExpiredAt ? toIso(data.subscriptionExpiredAt) : null,
      subscriptionRenewedAt: data.subscriptionRenewedAt ? toIso(data.subscriptionRenewedAt) : null,
      subscriptionUpdatedAt: data.subscriptionUpdatedAt ? toIso(data.subscriptionUpdatedAt) : null,
      subscriptionRenewalDate: data.subscriptionRenewalDate ? toIso(data.subscriptionRenewalDate) : null
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
