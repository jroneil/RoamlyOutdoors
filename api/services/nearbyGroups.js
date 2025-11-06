const GROUPS_DATA = [
  {
    id: 'pnw-weekend-hikers',
    name: 'PNW Weekend Hikers',
    city: 'Seattle',
    state: 'WA',
    latitude: 47.608,
    longitude: -122.335,
    activities: ['hiking', 'backpacking'],
    memberCount: 1280,
    upcomingEventsCount: 7,
    popularityScore: 92,
    activityScore: 88,
    coverImageUrl:
      'https://images.unsplash.com/photo-1520409364224-6343fca1f197?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'sound-kayak-collective',
    name: 'Sound Kayak Collective',
    city: 'Tacoma',
    state: 'WA',
    latitude: 47.2529,
    longitude: -122.4443,
    activities: ['paddling', 'camping'],
    memberCount: 830,
    upcomingEventsCount: 5,
    popularityScore: 84,
    activityScore: 81,
    coverImageUrl:
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'cascadia-trail-runners',
    name: 'Cascadia Trail Runners',
    city: 'Bellevue',
    state: 'WA',
    latitude: 47.6101,
    longitude: -122.2015,
    activities: ['trail running', 'cross-training'],
    memberCount: 460,
    upcomingEventsCount: 9,
    popularityScore: 76,
    activityScore: 93,
    coverImageUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'olympic-mountaineers',
    name: 'Olympic Mountaineers',
    city: 'Port Angeles',
    state: 'WA',
    latitude: 48.1181,
    longitude: -123.4307,
    activities: ['mountaineering', 'climbing'],
    memberCount: 540,
    upcomingEventsCount: 6,
    popularityScore: 79,
    activityScore: 86,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'gorge-climbers',
    name: 'Columbia Gorge Climbers',
    city: 'Hood River',
    state: 'OR',
    latitude: 45.7054,
    longitude: -121.5215,
    activities: ['climbing', 'bouldering'],
    memberCount: 610,
    upcomingEventsCount: 4,
    popularityScore: 82,
    activityScore: 74,
    coverImageUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'vancouver-island-packrafters',
    name: 'Vancouver Island Packrafters',
    city: 'Victoria',
    state: 'BC',
    latitude: 48.4284,
    longitude: -123.3656,
    activities: ['paddling', 'expeditions'],
    memberCount: 390,
    upcomingEventsCount: 3,
    popularityScore: 68,
    activityScore: 71,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'rockies-backcountry-skiers',
    name: 'Rockies Backcountry Skiers',
    city: 'Golden',
    state: 'BC',
    latitude: 51.2965,
    longitude: -116.9639,
    activities: ['ski touring', 'avalanche training'],
    memberCount: 720,
    upcomingEventsCount: 8,
    popularityScore: 88,
    activityScore: 90,
    coverImageUrl:
      'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'sierra-alpine-collective',
    name: 'Sierra Alpine Collective',
    city: 'Truckee',
    state: 'CA',
    latitude: 39.3279,
    longitude: -120.1833,
    activities: ['alpine climbing', 'ski mountaineering'],
    memberCount: 950,
    upcomingEventsCount: 6,
    popularityScore: 91,
    activityScore: 84,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80'
  }
];

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

const normalizePostalCode = (postalCode) => postalCode.trim().toUpperCase();

export const getNearbyGroups = ({
  latitude,
  longitude,
  postalCode,
  limit = 12,
  radiusMiles = 250
} = {}) => {
  let origin = null;

  if (typeof latitude === 'number' && typeof longitude === 'number' && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
    origin = { latitude, longitude };
  } else if (postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (normalized in POSTAL_CODE_COORDINATES) {
      origin = POSTAL_CODE_COORDINATES[normalized];
    } else {
      const nearby = Object.entries(POSTAL_CODE_COORDINATES).find(([code]) => code.startsWith(normalized));
      if (nearby) {
        origin = nearby[1];
      } else {
        throw new Error("We don't recognize that postal code yet. Try a nearby major city or share your location.");
      }
    }
  }

  if (!origin) {
    throw new Error('A valid latitude/longitude or postal code is required to search for groups.');
  }

  const groups = GROUPS_DATA.map((group) => {
    const distanceMiles = Math.round(distanceInMiles(origin.latitude, origin.longitude, group.latitude, group.longitude));
    return { ...group, distanceMiles };
  })
    .filter((group) => group.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit)
    .map(({ latitude: groupLat, longitude: groupLon, ...group }) => group);

  return groups;
};

export const isPostalCodeSupported = (postalCode) => {
  if (!postalCode) {
    return false;
  }
  const normalized = normalizePostalCode(postalCode);
  return normalized in POSTAL_CODE_COORDINATES;
};

export const nearbyGroupsDatasetSize = GROUPS_DATA.length;
