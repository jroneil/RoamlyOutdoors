import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitDocuments,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import type { UserDTO } from '../types/user';

type HomeStat = {
  label: string;
  value: string;
};

export type HomeBannerContent = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  stats: HomeStat[];
  imageUrl?: string;
};

type HomeEvent = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  groupName: string;
  attendance: string;
  tags?: string[];
};

type HomeGroup = {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  coverImageUrl?: string;
  activities?: string[];
  distanceMiles?: number;
};

type HomeFilterOption = {
  label: string;
  value: string;
};

export type HomeFilterConfig = {
  activities: HomeFilterOption[];
  distance: HomeFilterOption[];
};

type HomeContentResponse = {
  banner: HomeBannerContent;
  userEvents: HomeEvent[];
  userGroups: HomeGroup[];
  localGroups: HomeGroup[];
  filters: HomeFilterConfig;
};

const DEFAULT_BANNER: HomeBannerContent = {
  title: 'Plan your next trail adventure',
  subtitle:
    'Discover passionate outdoor groups near you, RSVP for upcoming events, and keep your crew in sync with Roamly Outdoors.',
  ctaLabel: 'Create an event',
  ctaHref: '/organizer',
  secondaryCtaLabel: 'Browse the calendar',
  secondaryCtaHref: '/events',
  stats: [
    { label: 'Active explorers', value: '2.3k' },
    { label: 'Upcoming adventures', value: '128' },
    { label: 'States represented', value: '18' }
  ],
  imageUrl:
    'https://images.unsplash.com/photo-1542293787938-4d2226c9dc9a?auto=format&fit=crop&w=1200&q=80'
};

const DEFAULT_FILTERS: HomeFilterConfig = {
  activities: [
    { label: 'Any activity', value: 'any' },
    { label: 'Hiking', value: 'hiking' },
    { label: 'Climbing', value: 'climbing' },
    { label: 'Paddling', value: 'paddling' },
    { label: 'Trail running', value: 'trail-running' }
  ],
  distance: [
    { label: 'Within 10 miles', value: '10' },
    { label: 'Within 25 miles', value: '25' },
    { label: 'Within 50 miles', value: '50' },
    { label: 'State-wide', value: 'state' }
  ]
};

const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed;
};

const sanitizeOptionalString = (value: unknown): string | undefined => {
  const sanitized = sanitizeString(value);
  return sanitized ? sanitized : undefined;
};

const sanitizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const sanitizeStringArray = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  values.forEach((value) => {
    const entry = sanitizeString(value);
    if (!entry) {
      return;
    }

    const normalized = entry.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    sanitized.push(entry);
  });

  return sanitized;
};

const toIsoString = (value: unknown): string => {
  if (!value) {
    return '';
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return '';
};

const parseBannerStats = (values: unknown): HomeStat[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (!value || typeof value !== 'object') {
        return null;
      }

      const record = value as Record<string, unknown>;
      const label = sanitizeString(record.label);
      const statValue = sanitizeString(record.value);

      if (!label || !statValue) {
        return null;
      }

      return { label, value: statValue } satisfies HomeStat;
    })
    .filter((stat): stat is HomeStat => Boolean(stat));
};

const fetchBannerContent = async (): Promise<HomeBannerContent> => {
  try {
    const snapshot = await getDoc(doc(db, 'siteContent', 'homeBanner'));

    if (!snapshot.exists()) {
      return DEFAULT_BANNER;
    }

    const data = snapshot.data() ?? {};
    const stats = parseBannerStats(data.stats);

    return {
      title: sanitizeString(data.title) || DEFAULT_BANNER.title,
      subtitle: sanitizeString(data.subtitle) || DEFAULT_BANNER.subtitle,
      ctaLabel: sanitizeString(data.ctaLabel) || DEFAULT_BANNER.ctaLabel,
      ctaHref: sanitizeString(data.ctaHref) || DEFAULT_BANNER.ctaHref,
      secondaryCtaLabel: sanitizeOptionalString(data.secondaryCtaLabel) ?? DEFAULT_BANNER.secondaryCtaLabel,
      secondaryCtaHref: sanitizeOptionalString(data.secondaryCtaHref) ?? DEFAULT_BANNER.secondaryCtaHref,
      stats: stats.length ? stats : DEFAULT_BANNER.stats,
      imageUrl: sanitizeOptionalString(data.imageUrl) ?? DEFAULT_BANNER.imageUrl
    } satisfies HomeBannerContent;
  } catch (error) {
    console.warn('Unable to load home banner content. Falling back to defaults.', error);
    return DEFAULT_BANNER;
  }
};

const parseFilterOptions = (values: unknown): HomeFilterOption[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (!value || typeof value !== 'object') {
        return null;
      }

      const record = value as Record<string, unknown>;
      const label = sanitizeString(record.label);
      const optionValue = sanitizeString(record.value);

      if (!label || !optionValue) {
        return null;
      }

      return { label, value: optionValue } satisfies HomeFilterOption;
    })
    .filter((option): option is HomeFilterOption => Boolean(option));
};

const fetchFilterConfig = async (): Promise<HomeFilterConfig> => {
  try {
    const snapshot = await getDoc(doc(db, 'siteContent', 'homeFilters'));

    if (!snapshot.exists()) {
      return DEFAULT_FILTERS;
    }

    const data = snapshot.data() ?? {};
    const activities = parseFilterOptions(data.activities);
    const distance = parseFilterOptions(data.distance);

    return {
      activities: activities.length ? activities : DEFAULT_FILTERS.activities,
      distance: distance.length ? distance : DEFAULT_FILTERS.distance
    } satisfies HomeFilterConfig;
  } catch (error) {
    console.warn('Unable to load home filter configuration. Using defaults.', error);
    return DEFAULT_FILTERS;
  }
};

type GroupRecord = {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  coverImageUrl?: string;
  activities: string[];
  ownerId?: string;
  organizerIds: string[];
  memberIds: string[];
  distanceMiles?: number;
};

const mapGroupDocument = (docSnapshot: QueryDocumentSnapshot<DocumentData>): GroupRecord => {
  const data = docSnapshot.data();
  const location = (typeof data.location === 'object' && data.location) || {};
  const city = sanitizeString((location as Record<string, unknown>).city ?? data.city) || '';
  const state = sanitizeString((location as Record<string, unknown>).state ?? data.state) || '';
  const members = sanitizeStringArray(data.members);
  const organizerIds = sanitizeStringArray(data.organizerIds);
  const activities = Array.isArray(data.activities)
    ? sanitizeStringArray(data.activities)
    : sanitizeStringArray(data.tags);
  const memberCount = (() => {
    const explicit = sanitizeNumber(data.memberCount);
    if (typeof explicit === 'number') {
      return Math.max(0, Math.round(explicit));
    }
    return members.length;
  })();

  const distanceRaw = sanitizeNumber(data.distanceMiles ?? data.distance);

  return {
    id: docSnapshot.id,
    name: sanitizeString(data.title ?? data.name) || docSnapshot.id,
    city,
    state,
    memberCount,
    coverImageUrl: sanitizeOptionalString(data.bannerImage ?? data.coverImageUrl),
    activities,
    ownerId: sanitizeOptionalString(data.ownerId),
    organizerIds,
    memberIds: members,
    distanceMiles: typeof distanceRaw === 'number' ? Math.max(0, Math.round(distanceRaw)) : undefined
  } satisfies GroupRecord;
};

const fetchGroupRecords = async (): Promise<GroupRecord[]> => {
  const groupsQuery = query(collection(db, 'groups'), limitDocuments(100));
  const snapshot = await getDocs(groupsQuery);
  return snapshot.docs.map(mapGroupDocument);
};

type EventRecord = {
  id: string;
  title: string;
  location: string;
  startDateIso: string;
  startDateValue: Date | null;
  groupId: string;
  groupName: string;
  capacity: number;
  attendeeNames: string[];
  tags: string[];
  createdById?: string;
  isVisible: boolean;
};

const mapEventDocument = (docSnapshot: QueryDocumentSnapshot<DocumentData>): EventRecord | null => {
  const data = docSnapshot.data();
  const startDateIso = toIsoString(data.startDate);
  const startDateValue = startDateIso ? new Date(startDateIso) : null;

  if (!startDateIso || !startDateValue) {
    return null;
  }

  const capacity = sanitizeNumber(data.capacity);
  const attendees = sanitizeStringArray(data.attendees);

  return {
    id: docSnapshot.id,
    title: sanitizeString(data.title) || docSnapshot.id,
    location: sanitizeString(data.location),
    startDateIso,
    startDateValue,
    groupId: sanitizeString(data.groupId),
    groupName: sanitizeString(data.groupTitle ?? data.groupName) || 'Untitled group',
    capacity: typeof capacity === 'number' ? Math.max(0, Math.round(capacity)) : 0,
    attendeeNames: attendees,
    tags: sanitizeStringArray(data.tags),
    createdById: sanitizeOptionalString(data.createdById),
    isVisible: data.isVisible !== false
  } satisfies EventRecord;
};

const fetchEventRecords = async (): Promise<EventRecord[]> => {
  const eventsQuery = query(collection(db, 'events'), orderBy('startDate', 'asc'), limitDocuments(100));
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs
    .map((docSnapshot) => mapEventDocument(docSnapshot))
    .filter((event): event is EventRecord => Boolean(event));
};

const fetchUserProfile = async (uid: string | null): Promise<UserDTO | null> => {
  if (!uid) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserDTO;
  } catch (error) {
    console.warn('Unable to load user profile for home content.', error);
    return null;
  }
};

const toHomeGroup = (record: GroupRecord): HomeGroup => ({
  id: record.id,
  name: record.name,
  city: record.city,
  state: record.state,
  memberCount: record.memberCount,
  coverImageUrl: record.coverImageUrl,
  activities: record.activities.length ? record.activities : undefined,
  distanceMiles: record.distanceMiles
});

const formatAttendance = (event: EventRecord): string => {
  const confirmedCount = event.attendeeNames.length;

  if (event.capacity > 0) {
    return `${confirmedCount} of ${event.capacity} spots filled`;
  }

  return confirmedCount > 0 ? `${confirmedCount} RSVPs` : 'No RSVPs yet';
};

const toHomeEvent = (event: EventRecord): HomeEvent => ({
  id: event.id,
  title: event.title,
  location: event.location,
  startDate: event.startDateIso,
  groupName: event.groupName,
  attendance: formatAttendance(event),
  tags: event.tags.length ? event.tags : undefined
});

const isUserGroup = (
  group: GroupRecord,
  userId: string | null,
  organizerGroupIds: Set<string>
): boolean => {
  if (!userId) {
    return false;
  }

  if (group.ownerId === userId) {
    return true;
  }

  if (group.organizerIds.includes(userId)) {
    return true;
  }

  if (group.memberIds.includes(userId)) {
    return true;
  }

  return organizerGroupIds.has(group.id);
};

const selectUpcomingEvents = (
  events: EventRecord[],
  eligibleGroupIds: Set<string>,
  userId: string | null
): EventRecord[] => {
  const now = new Date();

  return events
    .filter((event) => {
      if (!event.isVisible) {
        return false;
      }

      if (!event.startDateValue || event.startDateValue.getTime() < now.getTime()) {
        return false;
      }

      if (eligibleGroupIds.has(event.groupId)) {
        return true;
      }

      return Boolean(userId && event.createdById && event.createdById === userId);
    })
    .sort((a, b) => {
      if (!a.startDateValue || !b.startDateValue) {
        return 0;
      }
      return a.startDateValue.getTime() - b.startDateValue.getTime();
    })
    .slice(0, 6);
};

export const fetchHomeContent = async (): Promise<HomeContentResponse> => {
  const userId = auth.currentUser?.uid ?? null;

  const [banner, filters, groups, events, profile] = await Promise.all([
    fetchBannerContent(),
    fetchFilterConfig(),
    fetchGroupRecords(),
    fetchEventRecords(),
    fetchUserProfile(userId)
  ]);

  const organizerGroupIds = new Set<string>(
    sanitizeStringArray(profile?.organizerGroupIds ?? [])
  );

  const userGroupRecords = groups.filter((group) => isUserGroup(group, userId, organizerGroupIds));
  const userGroupIds = new Set(userGroupRecords.map((group) => group.id));

  const localGroupRecords = groups
    .filter((group) => !userGroupIds.has(group.id))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 12);

  const upcomingEvents = selectUpcomingEvents(events, userGroupIds, userId);

  return {
    banner,
    filters,
    userGroups: userGroupRecords.map(toHomeGroup),
    localGroups: localGroupRecords.map(toHomeGroup),
    userEvents: upcomingEvents.map(toHomeEvent)
  } satisfies HomeContentResponse;
};

export type { HomeContentResponse, HomeEvent, HomeGroup, HomeStat };
