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
import type { Event, EventAttendee } from '../types/event';
import { normalizeTagLabel } from '../types/tag';

type EventFilter = 'all' | 'upcoming' | 'past';

export interface UseEventsFilters {
  search?: string;
  tag?: string;
  filter?: EventFilter;
}

const normalizeTags = (values: unknown): { labels: string[]; ids: string[]; details: { id: string; label: string; normalizedLabel: string }[] } => {
  if (!Array.isArray(values)) {
    return { labels: [], ids: [], details: [] };
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  const ids: string[] = [];
  const details: { id: string; label: string; normalizedLabel: string }[] = [];

  values.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const label = value.trim();
    if (!label) {
      return;
    }

    const normalized = normalizeTagLabel(label);
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    labels.push(label);
    ids.push(normalized);
    details.push({ id: normalized, label, normalizedLabel: normalized });
  });

  return { labels, ids, details };
};

const normalizeAttendees = (values: unknown): { names: string[]; ids: string[]; roster: EventAttendee[] } => {
  if (!Array.isArray(values)) {
    return { names: [], ids: [], roster: [] };
  }

  const seen = new Set<string>();
  const names: string[] = [];
  const ids: string[] = [];
  const roster: EventAttendee[] = [];

  values.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const name = value.trim();
    if (!name) {
      return;
    }

    const normalized = name.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    names.push(name);
    ids.push(normalized);
    roster.push({
      attendeeId: normalized,
      displayName: name,
      status: 'confirmed',
      respondedAt: null
    });
  });

  return { names, ids, roster };
};

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

    const { labels: tagLabels, ids: tagIds, details: tagDetails } = normalizeTags(data.tags);
    const { names: attendeeNames, ids: attendeeIds, roster: attendeeRoster } = normalizeAttendees(
      data.attendees
    );

    return {
      id: doc.id,
      title: data.title ?? '',
      description: data.description ?? '',
      location: data.location ?? '',
      startDate: toIso(data.startDate),
      endDate: toIso(data.endDate),
      hostName: data.hostName ?? '',
      capacity: Number(data.capacity ?? 0),
      tags: tagLabels,
      tagIds,
      tagDetails,
      attendees: attendeeNames,
      attendeeIds,
      attendeeRoster,
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
      .filter((event) => event.isVisible)
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
