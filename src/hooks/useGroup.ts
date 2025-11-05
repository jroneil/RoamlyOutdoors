import { useEffect, useState } from 'react';
import { DocumentData, DocumentSnapshot, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Group } from '../types/group';

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

const mapSnapshot = (snapshot: DocumentSnapshot<DocumentData>): Group | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
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
