import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Event } from '../types/event';

type EventFilter = 'all' | 'upcoming' | 'past';

export interface UseEventsFilters {
  search?: string;
  tag?: string;
  filter?: EventFilter;
}

const mapDocToEvent = (snapshot: QuerySnapshot<DocumentData>) =>
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
      createdAt: toIso(data.createdAt)
    } satisfies Event;
  });

export const useEvents = ({ search = '', tag = '', filter = 'upcoming' }: UseEventsFilters) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const eventsQuery = query(collection(db, 'events'), orderBy('startDate', 'asc'));

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        setEvents(mapDocToEvent(snapshot));
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

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        if (!event.startDate) return true;
        const start = new Date(event.startDate);
        if (filter === 'upcoming') {
          return start >= now;
        }
        if (filter === 'past') {
          return start < now;
        }
        return true;
      })
      .filter((event) => {
        if (!search.trim()) return true;
        const haystack = `${event.title} ${event.location} ${event.description}`.toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
      })
      .filter((event) => {
        if (!tag) return true;
        return event.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase());
      });
  }, [events, filter, search, tag]);

  const tags = useMemo(() => {
    return Array.from(new Set(events.flatMap((event) => event.tags)));
  }, [events]);

  return {
    events: filteredEvents,
    isLoading,
    error,
    total: events.length,
    tags,
    allEvents: events
  };
};
