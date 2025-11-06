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

const homeBanner: HomeBannerContent = {
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

const sampleUserEvents: HomeEvent[] = [
  {
    id: 'event-1',
    title: 'Sunrise summit of Mount Fremont',
    location: 'Mount Rainier National Park, WA',
    startDate: '2024-07-12T05:30:00Z',
    groupName: 'Seattle Alpine Collective',
    attendance: '5 of 12 spots filled'
  },
  {
    id: 'event-2',
    title: 'Friday night paddle & campfire',
    location: 'Lake Crescent, WA',
    startDate: '2024-07-19T18:00:00Z',
    groupName: 'Puget Sound Kayakers',
    attendance: '12 RSVPs'
  },
  {
    id: 'event-3',
    title: 'Trail stewardship morning',
    location: 'Cougar Mountain, WA',
    startDate: '2024-07-27T08:00:00Z',
    groupName: 'Issaquah Trail Stewards',
    attendance: '8 volunteers confirmed'
  }
];

const sampleUserGroups: HomeGroup[] = [
  {
    id: 'group-1',
    name: 'Seattle Alpine Collective',
    city: 'Seattle',
    state: 'WA',
    memberCount: 286,
    activities: ['climbing', 'mountaineering'],
    distanceMiles: 4,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'group-2',
    name: 'Puget Sound Kayakers',
    city: 'Tacoma',
    state: 'WA',
    memberCount: 152,
    activities: ['paddling'],
    distanceMiles: 32,
    coverImageUrl:
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80'
  }
];

const sampleLocalGroups: HomeGroup[] = [
  {
    id: 'local-1',
    name: 'Cascadia Trail Runners',
    city: 'Bellevue',
    state: 'WA',
    memberCount: 94,
    activities: ['trail-running'],
    distanceMiles: 9,
    coverImageUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'local-2',
    name: 'North Bend Climbers',
    city: 'North Bend',
    state: 'WA',
    memberCount: 208,
    activities: ['climbing'],
    distanceMiles: 18,
    coverImageUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'local-3',
    name: 'Snoqualmie Packrafters',
    city: 'Snoqualmie',
    state: 'WA',
    memberCount: 61,
    activities: ['paddling'],
    distanceMiles: 42,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80'
  }
];

const filterConfig: HomeFilterConfig = {
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

export const fetchHomeContent = async (): Promise<HomeContentResponse> => {
  // Placeholder implementation to simulate an asynchronous data fetch.
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    banner: homeBanner,
    userEvents: sampleUserEvents,
    userGroups: sampleUserGroups,
    localGroups: sampleLocalGroups,
    filters: filterConfig
  };
};

export type { HomeContentResponse, HomeEvent, HomeGroup, HomeStat };
