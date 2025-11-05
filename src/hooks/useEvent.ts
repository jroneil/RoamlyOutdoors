import { useEffect, useState } from 'react';
import { DocumentData, DocumentSnapshot, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Event } from '../types/event';

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

const mapSnapshot = (snapshot: DocumentSnapshot<DocumentData>): Event | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const feeAmountCents =
    typeof data.feeAmountCents === 'number' && Number.isFinite(data.feeAmountCents)
      ? Math.max(0, Math.round(data.feeAmountCents))
      : null;
  const feeCurrency =
    feeAmountCents && typeof data.feeCurrency === 'string' && data.feeCurrency.trim()
      ? data.feeCurrency.trim().toUpperCase()
      : null;
  const feeDescription =
    feeAmountCents && typeof data.feeDescription === 'string' && data.feeDescription.trim()
      ? data.feeDescription.trim()
      : null;
  const feeDisclosure =
    feeAmountCents && typeof data.feeDisclosure === 'string' && data.feeDisclosure.trim()
      ? data.feeDisclosure.trim()
      : null;
  return {
    id: snapshot.id,
    title: data.title ?? '',
    description: data.description ?? '',
    location: data.location ?? '',
    startDate: toIso(data.startDate),
    endDate: toIso(data.endDate),
    hostName: data.hostName ?? '',
    capacity: Number(data.capacity ?? 0),
    tags: Array.isArray(data.tags) ? data.tags : [],
    attendees: Array.isArray(data.attendees) ? data.attendees : [],
    bannerImage: data.bannerImage ?? undefined,
    groupId: data.groupId ?? '',
    groupTitle: data.groupTitle ?? '',
    createdAt: toIso(data.createdAt),
    createdById: typeof data.createdById === 'string' ? data.createdById : undefined,
    feeAmountCents,
    feeCurrency,
    feeDescription,
    feeDisclosure,
    isVisible: data.isVisible !== false,
    hiddenReason: data.hiddenReason ?? null,
    hiddenAt: data.hiddenAt ? toIso(data.hiddenAt) : null
  };
};

export const useEvent = (eventId?: string) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const ref = doc(db, 'events', eventId);
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setEvent(mapSnapshot(snapshot));
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { event, isLoading, error };
};
