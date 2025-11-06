import { getFirestore } from '../firebaseAdmin.js';

const POSTAL_CODE_COORDINATES = {
  '98101': { latitude: 47.6101, longitude: -122.3364 },
  '98109': { latitude: 47.6262, longitude: -122.3505 },
  '97201': { latitude: 45.5122, longitude: -122.6814 },
  '98607': { latitude: 45.6776, longitude: -122.5533 },
  'V6B1A1': { latitude: 49.2827, longitude: -123.1207 },
  'V8W1L3': { latitude: 48.4284, longitude: -123.3656 },
  '80443': { latitude: 39.5775, longitude: -106.0932 },
  '96161': { latitude: 39.3279, longitude: -120.1833 }
};

const EARTH_RADIUS_MILES = 3958.8;
const DATASET_TTL_MS = 5 * 60 * 1000;

const toRadians = (value) => (value * Math.PI) / 180;

const distanceInMiles = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
};

const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const sanitizeOptionalString = (value) => {
  const sanitized = sanitizeString(value);
  return sanitized || undefined;
};

const sanitizeNumber = (value) => {
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

const sanitizeStringArray = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const entries = [];

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
    entries.push(entry);
  });

  return entries;
};

const resolveMemberCount = (data) => {
  const explicit = sanitizeNumber(data.memberCount);
  if (typeof explicit === 'number') {
    return Math.max(0, Math.round(explicit));
  }

  const members = Array.isArray(data.members) ? sanitizeStringArray(data.members) : [];
  return members.length;
};

let cachedDataset = null;

const loadGroupDataset = async () => {
  const firestore = getFirestore();
  if (!firestore) {
    throw new LocationServiceUnavailableError(
      'Location search is unavailable right now. Please try again later.'
    );
  }

  const snapshot = await firestore.collection('groups').get();
  const records = [];

  snapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    const location = (typeof data.location === 'object' && data.location) || {};
    const coordinates =
      (location.coordinates && typeof location.coordinates === 'object' && location.coordinates) ||
      location;

    const latitude = sanitizeNumber(coordinates.latitude ?? coordinates.lat);
    const longitude = sanitizeNumber(coordinates.longitude ?? coordinates.lng);

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return;
    }

    const city = sanitizeString(location.city ?? data.city);
    const state = sanitizeString(location.state ?? data.state);
    const activities = Array.isArray(data.activities)
      ? sanitizeStringArray(data.activities)
      : sanitizeStringArray(data.tags);
    const coverImageUrl = sanitizeOptionalString(data.bannerImage ?? data.coverImageUrl);
    const popularity = sanitizeNumber(data.popularityScore);
    const activityScore = sanitizeNumber(data.activityScore);
    const upcomingEventsCount = sanitizeNumber(data.upcomingEventsCount);

    records.push({
      id: doc.id,
      name: sanitizeString(data.title ?? data.name) || doc.id,
      city,
      state,
      latitude,
      longitude,
      activities,
      memberCount: resolveMemberCount(data),
      coverImageUrl,
      popularityScore: typeof popularity === 'number' ? popularity : undefined,
      activityScore: typeof activityScore === 'number' ? activityScore : undefined,
      upcomingEventsCount: typeof upcomingEventsCount === 'number' ? upcomingEventsCount : 0
    });
  });

  cachedDataset = {
    expiresAt: Date.now() + DATASET_TTL_MS,
    records
  };

  return records;
};

const getDataset = async () => {
  if (cachedDataset && cachedDataset.expiresAt > Date.now()) {
    return cachedDataset.records;
  }

  try {
    return await loadGroupDataset();
  } catch (error) {
    if (cachedDataset) {
      console.warn('Falling back to cached nearby group dataset after fetch failure.', error);
      return cachedDataset.records;
    }
    throw error;
  }
};

const normalizePostalCode = (postalCode) => postalCode.trim().toUpperCase();

const resolveOrigin = ({ latitude, longitude, postalCode }) => {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    return { latitude, longitude };
  }

  if (postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (normalized in POSTAL_CODE_COORDINATES) {
      return POSTAL_CODE_COORDINATES[normalized];
    }

    const nearby = Object.entries(POSTAL_CODE_COORDINATES).find(([code]) =>
      code.startsWith(normalized)
    );
    if (nearby) {
      return nearby[1];
    }
  }

  return null;
};

export class InvalidLocationInputError extends Error {
  constructor(message = 'A valid latitude/longitude or postal code is required to search for groups.') {
    super(message);
    this.name = 'InvalidLocationInputError';
  }
}

export class LocationServiceUnavailableError extends Error {
  constructor(message = 'Location search is unavailable right now.') {
    super(message);
    this.name = 'LocationServiceUnavailableError';
  }
}

export const getNearbyGroups = async ({
  latitude,
  longitude,
  postalCode,
  limit = 12,
  radiusMiles = 250
} = {}) => {
  const origin = resolveOrigin({ latitude, longitude, postalCode });

  if (!origin) {
    throw new InvalidLocationInputError();
  }

  const groups = await getDataset();

  const maxResults = Math.max(1, Number(limit) || 0);
  const maxRadius = Math.max(1, Number(radiusMiles) || 0);

  return groups
    .map((group) => {
      const distanceMiles = Math.round(
        distanceInMiles(origin.latitude, origin.longitude, group.latitude, group.longitude)
      );

      return {
        id: group.id,
        name: group.name,
        city: group.city,
        state: group.state,
        memberCount: group.memberCount,
        activities: group.activities,
        coverImageUrl: group.coverImageUrl,
        distanceMiles,
        popularityScore: typeof group.popularityScore === 'number' ? group.popularityScore : group.memberCount,
        activityScore: typeof group.activityScore === 'number' ? group.activityScore : group.activities.length,
        upcomingEventsCount: group.upcomingEventsCount
      };
    })
    .filter((group) => group.distanceMiles <= maxRadius)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, maxResults);
};

export const isPostalCodeSupported = (postalCode) => {
  if (!postalCode) {
    return false;
  }
  const normalized = normalizePostalCode(postalCode);
  return normalized in POSTAL_CODE_COORDINATES;
};
