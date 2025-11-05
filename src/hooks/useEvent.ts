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
    createdAt: toIso(data.createdAt)
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
