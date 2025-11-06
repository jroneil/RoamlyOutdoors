const DEFAULT_PROVIDER = (process.env.GEOCODER_PROVIDER || 'NOMINATIM').toUpperCase();
const DEFAULT_COUNTRY = (process.env.DEFAULT_COUNTRY || 'US').toUpperCase();
const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const CACHE_TTL_SECONDS = Number.parseInt(process.env.ZIP_CACHE_TTL_SECONDS || '', 10);
const CACHE_TTL_MS = Number.isFinite(CACHE_TTL_SECONDS) && CACHE_TTL_SECONDS > 0
  ? CACHE_TTL_SECONDS * 1000
  : 24 * 60 * 60 * 1000;
const GEOCODER_USER_AGENT =
  process.env.GEOCODER_USER_AGENT || 'RoamlyOutdoors/1.0 (support@roamlyoutdoors.test)';
const REQUEST_TIMEOUT_MS = 7000;

const cache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, { fetchImpl = fetch } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': GEOCODER_USER_AGENT,
        ...options.headers
      }
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizePostalCode = (postalCode = '', country = DEFAULT_COUNTRY) => {
  const trimmed = String(postalCode || '').trim();
  if (!trimmed) {
    return '';
  }

  if (country.toUpperCase() === 'US') {
    const match = trimmed.match(/^\d{5}(?:-\d{4})?$/);
    if (!match) {
      return '';
    }
    return trimmed.slice(0, 5);
  }

  return trimmed.toUpperCase();
};

export class PostalCodeValidationError extends Error {
  constructor(message = 'A valid postal code is required.') {
    super(message);
    this.name = 'PostalCodeValidationError';
    this.code = 'ZIP_INVALID';
  }
}

export class PostalCodeNotFoundError extends Error {
  constructor(message = 'We could not find that postal code.') {
    super(message);
    this.name = 'PostalCodeNotFoundError';
    this.code = 'ZIP_NOT_FOUND';
  }
}

export class GeocodingServiceError extends Error {
  constructor(message = 'Geocoding service failed.') {
    super(message);
    this.name = 'GeocodingServiceError';
    this.code = 'GEOCODER_FAILED';
  }
}

const getCacheKey = ({ postalCode, country }) => `${country.toUpperCase()}:${postalCode}`;

export const clearGeocodeCache = () => {
  cache.clear();
};

const getCachedCoords = ({ postalCode, country, now = Date.now }) => {
  const key = getCacheKey({ postalCode, country });
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return { latitude: entry.latitude, longitude: entry.longitude };
};

const setCacheEntry = ({ postalCode, country, latitude, longitude, now = Date.now }) => {
  const key = getCacheKey({ postalCode, country });
  cache.set(key, {
    latitude,
    longitude,
    expiresAt: now() + CACHE_TTL_MS
  });
};

const parseNominatimResponse = (payload) => {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const result = payload[0];
  const lat = Number.parseFloat(result.lat);
  const lon = Number.parseFloat(result.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { latitude: lat, longitude: lon };
};

const fetchNominatim = async ({ postalCode, country, fetchImpl, retries = 1 }) => {
  const base = new URL('search', NOMINATIM_BASE_URL);
  base.searchParams.set('format', 'jsonv2');
  base.searchParams.set('limit', '1');
  base.searchParams.set('postalcode', postalCode);
  base.searchParams.set('countrycodes', country.toLowerCase());

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(base, {}, { fetchImpl });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new GeocodingServiceError(
          `Nominatim returned status ${response.status}`
        );
      }
      const payload = await response.json();
      return parseNominatimResponse(payload);
    } catch (error) {
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      if (error instanceof GeocodingServiceError) {
        throw error;
      }
      if (error.name === 'AbortError') {
        throw new GeocodingServiceError('Geocoding request timed out.');
      }
      throw new GeocodingServiceError(
        error instanceof Error ? error.message : 'Nominatim request failed.'
      );
    }
  }

  return null;
};

const fetchMapbox = async ({ postalCode, country, fetchImpl }) => {
  if (!MAPBOX_TOKEN) {
    throw new GeocodingServiceError('Mapbox token not configured.');
  }

  const encoded = encodeURIComponent(postalCode);
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`);
  url.searchParams.set('limit', '1');
  url.searchParams.set('types', 'postcode');
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('country', country.toUpperCase());

  const response = await fetchWithTimeout(url, {}, { fetchImpl });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new GeocodingServiceError(`Mapbox returned status ${response.status}`);
  }

  const payload = await response.json();
  const feature = payload?.features?.[0];
  const [lon, lat] = Array.isArray(feature?.center) ? feature.center : [];

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { latitude: lat, longitude: lon };
};

const fetchGoogle = async ({ postalCode, country, fetchImpl }) => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new GeocodingServiceError('Google Maps API key not configured.');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('components', `postal_code:${postalCode}|country:${country}`);
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  const response = await fetchWithTimeout(url, {}, { fetchImpl });
  if (!response.ok) {
    throw new GeocodingServiceError(`Google Geocoding returned status ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status === 'ZERO_RESULTS') {
    return null;
  }
  if (payload?.status && payload.status !== 'OK') {
    throw new GeocodingServiceError(`Google Geocoding error: ${payload.status}`);
  }

  const location = payload?.results?.[0]?.geometry?.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { latitude: lat, longitude: lng };
};

const selectProvider = (provider = DEFAULT_PROVIDER) => {
  switch (provider) {
    case 'MAPBOX':
      return fetchMapbox;
    case 'GOOGLE':
    case 'GOOGLE_MAPS':
      return fetchGoogle;
    case 'NOMINATIM':
    default:
      return fetchNominatim;
  }
};

export const geocodePostalCode = async (
  { postalCode, country = DEFAULT_COUNTRY },
  { fetchImpl = fetch, now = Date.now, provider = DEFAULT_PROVIDER } = {}
) => {
  const normalizedCountry = String(country || DEFAULT_COUNTRY).toUpperCase();
  const normalizedPostal = normalizePostalCode(postalCode, normalizedCountry);

  if (!normalizedPostal) {
    throw new PostalCodeValidationError();
  }

  const cached = getCachedCoords({ postalCode: normalizedPostal, country: normalizedCountry, now });
  if (cached) {
    return { ...cached, source: 'cache', postalCode: normalizedPostal, country: normalizedCountry };
  }

  const providerImpl = selectProvider(provider);
  const result = await providerImpl({ postalCode: normalizedPostal, country: normalizedCountry, fetchImpl });

  if (!result) {
    throw new PostalCodeNotFoundError();
  }

  setCacheEntry({
    postalCode: normalizedPostal,
    country: normalizedCountry,
    latitude: result.latitude,
    longitude: result.longitude,
    now
  });

  return { ...result, source: 'provider', postalCode: normalizedPostal, country: normalizedCountry };
};

export const getDefaultCountry = () => DEFAULT_COUNTRY;
export const getSelectedProvider = () => DEFAULT_PROVIDER;
export const normalizePostalCodeForCountry = normalizePostalCode;
