export type DashboardGroupRole = 'owner' | 'organizer' | 'member';

type MembershipStatus = 'active' | 'invited' | 'pending';

type GroupMembership = {
  userId: string;
  role: DashboardGroupRole;
  status: MembershipStatus;
};

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

interface DashboardGroupRecord {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  coverImageUrl?: string;
  nextEvent?: { id: string; title: string; startDate: string } | null;
  memberships: GroupMembership[];
}

const sampleGroups: DashboardGroupRecord[] = [
  {
    id: 'group-1',
    name: 'Seattle Alpine Collective',
    city: 'Seattle',
    state: 'WA',
    memberCount: 286,
    coverImageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-1',
      title: 'Sunrise summit of Mount Fremont',
      startDate: '2024-07-12T05:30:00Z'
    },
    memberships: [
      { userId: 'dev-user', role: 'owner', status: 'active' },
      { userId: 'organizer-2', role: 'organizer', status: 'active' },
      { userId: 'member-1', role: 'member', status: 'active' }
    ]
  },
  {
    id: 'group-2',
    name: 'Puget Sound Kayakers',
    city: 'Tacoma',
    state: 'WA',
    memberCount: 152,
    coverImageUrl:
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-2',
      title: 'Friday night paddle & campfire',
      startDate: '2024-07-19T18:00:00Z'
    },
    memberships: [
      { userId: 'dev-user', role: 'organizer', status: 'active' },
      { userId: 'owner-2', role: 'owner', status: 'active' },
      { userId: 'member-2', role: 'member', status: 'active' }
    ]
  },
  {
    id: 'group-3',
    name: 'Issaquah Trail Stewards',
    city: 'Issaquah',
    state: 'WA',
    memberCount: 87,
    coverImageUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
    nextEvent: {
      id: 'event-3',
      title: 'Trail stewardship morning',
      startDate: '2024-07-27T08:00:00Z'
    },
    memberships: [
      { userId: 'dev-user', role: 'member', status: 'active' },
      { userId: 'owner-3', role: 'owner', status: 'active' },
      { userId: 'organizer-3', role: 'organizer', status: 'invited' }
    ]
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

const determineRoleFromMemberships = (
  memberships: GroupMembership[] | undefined,
  userId: string | null | undefined
): DashboardGroupRole => {
  if (!userId) {
    return 'member';
  }

  const activeMembership = memberships?.find(
    (membership) => membership.userId === userId && membership.status === 'active'
  );

  if (!activeMembership) {
    return 'member';
  }

  if (activeMembership.role === 'owner' || activeMembership.role === 'organizer') {
    return activeMembership.role;
  }

  return 'member';
};

export const fetchDashboardActivity = async (
  userId: string | null | undefined
): Promise<DashboardActivityResponse> => {
  if (!userId) {
    return { groups: [], events: [] };
  }

  return simulateFetch({
    groups: sampleGroups.map(({ memberships, nextEvent, ...rest }) => ({
      ...rest,
      role: determineRoleFromMemberships(memberships, userId),
      nextEvent: nextEvent ? { ...nextEvent } : null
    })),
    events: sampleEvents.map((event) => ({ ...event }))
  });
};
