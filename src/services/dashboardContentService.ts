export type DashboardGroupRole = 'owner' | 'organizer' | 'member';

export interface DashboardGroupSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  role: DashboardGroupRole;
  coverImageUrl?: string;
  nextEvent?: {
    id: string;
    title: string;
    startDate: string;
  } | null;
}

export type DashboardEventStatus = 'open' | 'waitlist' | 'draft';

export interface DashboardEventSummary {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  startDate: string;
  location: string;
  attendeeSummary: string;
  status: DashboardEventStatus;
}

export interface DashboardActivityResponse {
  groups: DashboardGroupSummary[];
  events: DashboardEventSummary[];
}

const sampleGroups: DashboardGroupSummary[] = [
  {
    id: 'group-1',
    name: 'Seattle Alpine Collective',
    city: 'Seattle',
    state: 'WA',
    memberCount: 286,
    role: 'owner',
    coverImageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-1',
      title: 'Sunrise summit of Mount Fremont',
      startDate: '2024-07-12T05:30:00Z'
    }
  },
  {
    id: 'group-2',
    name: 'Puget Sound Kayakers',
    city: 'Tacoma',
    state: 'WA',
    memberCount: 152,
    role: 'organizer',
    coverImageUrl:
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-2',
      title: 'Friday night paddle & campfire',
      startDate: '2024-07-19T18:00:00Z'
    }
  },
  {
    id: 'group-3',
    name: 'Issaquah Trail Stewards',
    city: 'Issaquah',
    state: 'WA',
    memberCount: 87,
    role: 'member',
    coverImageUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-3',
      title: 'Trail stewardship morning',
      startDate: '2024-07-27T08:00:00Z'
    }
  }
];

const sampleEvents: DashboardEventSummary[] = [
  {
    id: 'event-1',
    title: 'Sunrise summit of Mount Fremont',
    groupId: 'group-1',
    groupName: 'Seattle Alpine Collective',
    startDate: '2024-07-12T05:30:00Z',
    location: 'Mount Rainier National Park, WA',
    attendeeSummary: '5 of 12 spots filled',
    status: 'open'
  },
  {
    id: 'event-2',
    title: 'Friday night paddle & campfire',
    groupId: 'group-2',
    groupName: 'Puget Sound Kayakers',
    startDate: '2024-07-19T18:00:00Z',
    location: 'Lake Crescent, WA',
    attendeeSummary: '12 RSVPs',
    status: 'open'
  },
  {
    id: 'event-3',
    title: 'Trail stewardship morning',
    groupId: 'group-3',
    groupName: 'Issaquah Trail Stewards',
    startDate: '2024-07-27T08:00:00Z',
    location: 'Cougar Mountain, WA',
    attendeeSummary: '8 volunteers confirmed',
    status: 'waitlist'
  },
  {
    id: 'event-4',
    title: 'Route-setting workshop',
    groupId: 'group-1',
    groupName: 'Seattle Alpine Collective',
    startDate: '2024-08-02T17:30:00Z',
    location: 'Seattle Bouldering Project, WA',
    attendeeSummary: 'Draft saved — publish to invite members',
    status: 'draft'
  }
];

const simulateFetch = async <T>(data: T): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, 180));
  return data;
};

export const fetchDashboardActivity = async (
  userId: string | null | undefined
): Promise<DashboardActivityResponse> => {
  if (!userId) {
    return { groups: [], events: [] };
  }

  return simulateFetch({
    groups: sampleGroups.map((group) => ({
      ...group,
      nextEvent: group.nextEvent ? { ...group.nextEvent } : null
    })),
    events: sampleEvents.map((event) => ({ ...event }))
  });
};
