import { getFirestore as getFirestoreDefault } from '../firebaseAdmin.js';
import {
  geocodePostalCode as geocodePostalCodeDefault,
  GeocodingServiceError,
  PostalCodeNotFoundError,
  PostalCodeValidationError,
  normalizePostalCodeForCountry,
  getDefaultCountry
} from './geocoding.js';

const EARTH_RADIUS_MILES = 3958.8;
const EARTH_RADIUS_KILOMETERS = 6371;
const DATASET_TTL_MS = 5 * 60 * 1000;
const DEFAULT_RADIUS_MILES = Number.isFinite(Number(process.env.DEFAULT_RADIUS_MI))
  ? Number(process.env.DEFAULT_RADIUS_MI)
  : 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_COUNTRY = getDefaultCountry();

let geocodePostalCodeImpl = geocodePostalCodeDefault;
let getFirestoreImpl = getFirestoreDefault;

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

const distanceInKilometers = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KILOMETERS * c;
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
  const firestore = getFirestoreImpl();
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
    const country = sanitizeString(location.country ?? data.country ?? DEFAULT_COUNTRY);
    const rawPostalCode = sanitizeString(location.postalCode ?? data.postalCode);
    const normalizedPostalCode = rawPostalCode
      ? normalizePostalCodeForCountry(rawPostalCode, country || DEFAULT_COUNTRY)
      : undefined;
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
      upcomingEventsCount: typeof upcomingEventsCount === 'number' ? upcomingEventsCount : 0,
      postalCode: normalizedPostalCode || undefined,
      country: country ? country.toUpperCase() : undefined
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

const resolveOrigin = async ({ latitude, longitude, postalCode, country }) => {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return {
      latitude,
      longitude,
      source: 'coordinates',
      country: (country || DEFAULT_COUNTRY).toUpperCase()
    };
  }

  if (postalCode) {
    const result = await geocodePostalCodeImpl({ postalCode, country: country || DEFAULT_COUNTRY });
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      source: result.source,
      postalCode: result.postalCode,
      country: result.country
    };
  }

  return null;
};

const clampPageSize = (value) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(value)));
};

const toNumberOrUndefined = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const roundToDecimal = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

const computeDistanceMetrics = (origin, group) => {
  const miles = distanceInMiles(origin.latitude, origin.longitude, group.latitude, group.longitude);
  const kilometers = distanceInKilometers(
    origin.latitude,
    origin.longitude,
    group.latitude,
    group.longitude
  );
  return {
    distanceMiles: miles,
    distanceKilometers: kilometers,
    distanceMeters: kilometers * 1000
  };
};

export const getNearbyGroups = async ({
  latitude,
  longitude,
  postalCode,
  country = DEFAULT_COUNTRY,
  limit,
  radius,
  radiusMiles,
  units = 'mi',
  page,
  pageSize,
  exactPostalCode = false
} = {}) => {
  const normalizedUnits = String(units).toLowerCase() === 'km' ? 'km' : 'mi';
  const fallbackRadius = Number.isFinite(Number(radiusMiles)) ? Number(radiusMiles) : DEFAULT_RADIUS_MILES;
  let resolvedRadius = Number(radius);

  if (!Number.isFinite(resolvedRadius) || resolvedRadius <= 0) {
    resolvedRadius = fallbackRadius;
  }

  const origin = await resolveOrigin({ latitude, longitude, postalCode, country });

  if (!origin) {
    throw new InvalidLocationInputError();
  }

  const groups = await getDataset();

  const normalizedPostal = postalCode
    ? normalizePostalCodeForCountry(postalCode, origin.country || country || DEFAULT_COUNTRY)
    : undefined;

  const resolvedPageSize = clampPageSize(
    toNumberOrUndefined(pageSize) ?? toNumberOrUndefined(limit) ?? DEFAULT_PAGE_SIZE
  );
  const resolvedPage = Math.max(1, Math.trunc(toNumberOrUndefined(page) ?? 1));

  const radiusMilesValue = normalizedUnits === 'km' ? resolvedRadius / 1.609344 : resolvedRadius;
  const radiusMeters = normalizedUnits === 'km' ? resolvedRadius * 1000 : resolvedRadius * 1609.344;

  const enriched = groups
    .map((group) => {
      const metrics = computeDistanceMetrics(origin, group);
      return {
        id: group.id,
        name: group.name,
        city: group.city,
        state: group.state,
        memberCount: group.memberCount,
        activities: group.activities,
        coverImageUrl: group.coverImageUrl,
        popularityScore:
          typeof group.popularityScore === 'number' ? group.popularityScore : group.memberCount,
        activityScore:
          typeof group.activityScore === 'number' ? group.activityScore : group.activities.length,
        upcomingEventsCount: group.upcomingEventsCount,
        latitude: group.latitude,
        longitude: group.longitude,
        postalCode: group.postalCode,
        country: group.country,
        distanceMiles: metrics.distanceMiles,
        distanceMeters: metrics.distanceMeters
      };
    })
    .filter((group) => group.distanceMiles <= radiusMilesValue)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  let prioritized = enriched;

  if (exactPostalCode && normalizedPostal) {
    const exactMatches = enriched.filter((group) => group.postalCode === normalizedPostal);
    if (exactMatches.length > 0) {
      const others = enriched.filter((group) => group.postalCode !== normalizedPostal);
      prioritized = [...exactMatches, ...others];
    }
  }

  const totalResults = prioritized.length;
  const offset = (resolvedPage - 1) * resolvedPageSize;
  const paginated = prioritized.slice(offset, offset + resolvedPageSize).map((group) => ({
    id: group.id,
    name: group.name,
    city: group.city,
    state: group.state,
    memberCount: group.memberCount,
    activities: group.activities,
    coverImageUrl: group.coverImageUrl,
    popularityScore: group.popularityScore,
    activityScore: group.activityScore,
    upcomingEventsCount: group.upcomingEventsCount,
    distanceMiles: roundToDecimal(group.distanceMiles, 1),
    distanceMeters: Math.round(group.distanceMeters),
    postalCode: group.postalCode,
    country: group.country
  }));

  return {
    center: { lat: origin.latitude, lng: origin.longitude },
    radius: roundToDecimal(resolvedRadius, 2),
    units: normalizedUnits,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    totalResults,
    groups: paginated,
    radiusMeters: Math.round(radiusMeters)
  };
};

export const isPostalCodeSupported = (postalCode, country = DEFAULT_COUNTRY) => {
  if (!postalCode) {
    return false;
  }
  return Boolean(normalizePostalCodeForCountry(postalCode, country));
};

export const setGeocodeProvider = (provider) => {
  geocodePostalCodeImpl = provider || geocodePostalCodeDefault;
};

export const setFirestoreProvider = (provider) => {
  getFirestoreImpl = provider || getFirestoreDefault;
};

export const clearNearbyGroupsCache = () => {
  cachedDataset = null;
};

export {
  GeocodingServiceError,
  PostalCodeNotFoundError,
  PostalCodeValidationError
};
