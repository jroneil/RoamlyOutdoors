import type { Event, EventAttendee } from '../types/event';
import type { Group, GroupMembership, GroupRole } from '../types/group';
import type { Tag } from '../types/tag';
import { normalizeTagLabel } from '../types/tag';

export type DashboardGroupRole = 'owner' | 'organizer' | 'member';

export type LocalDirectoryCategory = 'gear-shop' | 'guide-service' | 'volunteer' | 'education';

export interface LocalDirectoryEntry {
  id: string;
  name: string;
  description: string;
  category: LocalDirectoryCategory;
  city: string;
  state: string;
  url: string;
  imageUrl?: string;
  affiliatedGroupIds?: string[];
  tags: Tag[];
  tagIds: string[];
}

export interface LocalDirectoryFilters {
  state?: string;
  tagId?: string;
  category?: LocalDirectoryCategory;
  limit?: number;
}

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

interface FetchUserEventsOptions {
  groupIds?: string[];
  includeHidden?: boolean;
}

const defineTag = (id: string, label: string, category?: string): Tag => ({
  id,
  label,
  category,
  normalizedLabel: normalizeTagLabel(label)
});

const TAG_LIBRARY: Record<string, Tag> = {
  'tag-alpine': defineTag('tag-alpine', 'Alpine Climbing', 'activity'),
  'tag-backpacking': defineTag('tag-backpacking', 'Backpacking', 'activity'),
  'tag-kayaking': defineTag('tag-kayaking', 'Sea Kayaking', 'activity'),
  'tag-trailwork': defineTag('tag-trailwork', 'Trail Stewardship', 'volunteer'),
  'tag-community': defineTag('tag-community', 'Community Meetup', 'gathering'),
  'tag-gear': defineTag('tag-gear', 'Gear Rentals', 'service'),
  'tag-education': defineTag('tag-education', 'Skills Class', 'education'),
  'tag-campfire': defineTag('tag-campfire', 'Campfire Social', 'gathering'),
  'tag-route-setting': defineTag('tag-route-setting', 'Route Setting', 'education')
};

const resolveTags = (ids: string[] = []): Tag[] =>
  ids
    .map((id) => TAG_LIBRARY[id])
    .filter((tag): tag is Tag => Boolean(tag))
    .map((tag) => ({ ...tag }));

const cloneMembership = (membership: GroupMembership): GroupMembership => ({ ...membership });

const createMembership = ({
  groupId,
  memberId,
  displayName,
  role,
  status,
  joinedAt,
  invitedAt
}: {
  groupId: string;
  memberId: string;
  displayName: string;
  role: GroupRole;
  status: GroupMembership['status'];
  joinedAt?: string;
  invitedAt?: string;
}): GroupMembership => ({
  id: `${groupId}:${memberId}:${role}`,
  memberId,
  displayName,
  role,
  status,
  joinedAt: joinedAt ?? null,
  invitedAt: invitedAt ?? null
});

const groupMemberships: Record<string, GroupMembership[]> = {
  'group-1': [
    createMembership({
      groupId: 'group-1',
      memberId: 'dev-user',
      displayName: 'Dev User',
      role: 'owner',
      status: 'active',
      joinedAt: '2023-06-01T15:00:00Z'
    }),
    createMembership({
      groupId: 'group-1',
      memberId: 'organizer-2',
      displayName: 'Avery Johnson',
      role: 'organizer',
      status: 'active',
      joinedAt: '2023-07-18T18:20:00Z'
    }),
    createMembership({
      groupId: 'group-1',
      memberId: 'member-1',
      displayName: 'Robin Singh',
      role: 'member',
      status: 'active',
      joinedAt: '2023-09-22T16:00:00Z'
    }),
    createMembership({
      groupId: 'group-1',
      memberId: 'pending-1',
      displayName: 'Jamie Fox',
      role: 'member',
      status: 'pending',
      invitedAt: '2024-06-25T12:05:00Z'
    })
  ],
  'group-2': [
    createMembership({
      groupId: 'group-2',
      memberId: 'owner-2',
      displayName: 'Morgan Blake',
      role: 'owner',
      status: 'active',
      joinedAt: '2022-04-02T09:00:00Z'
    }),
    createMembership({
      groupId: 'group-2',
      memberId: 'dev-user',
      displayName: 'Dev User',
      role: 'organizer',
      status: 'active',
      joinedAt: '2023-11-10T21:12:00Z'
    }),
    createMembership({
      groupId: 'group-2',
      memberId: 'member-2',
      displayName: 'Noor Patel',
      role: 'member',
      status: 'active',
      joinedAt: '2024-02-18T17:30:00Z'
    }),
    createMembership({
      groupId: 'group-2',
      memberId: 'member-3',
      displayName: 'Taylor Reed',
      role: 'member',
      status: 'invited',
      invitedAt: '2024-06-20T14:45:00Z'
    })
  ],
  'group-3': [
    createMembership({
      groupId: 'group-3',
      memberId: 'owner-3',
      displayName: 'Felicia Gomez',
      role: 'owner',
      status: 'active',
      joinedAt: '2021-09-14T13:00:00Z'
    }),
    createMembership({
      groupId: 'group-3',
      memberId: 'dev-user',
      displayName: 'Dev User',
      role: 'member',
      status: 'active',
      joinedAt: '2023-03-11T09:30:00Z'
    }),
    createMembership({
      groupId: 'group-3',
      memberId: 'organizer-3',
      displayName: 'Kai Matsumoto',
      role: 'organizer',
      status: 'invited',
      invitedAt: '2024-07-01T08:00:00Z'
    })
  ]
};

const toActiveMembers = (memberships: GroupMembership[]): string[] =>
  memberships
    .filter((membership) => membership.status === 'active')
    .map((membership) => membership.displayName);

const toOrganizers = (memberships: GroupMembership[]): string[] =>
  memberships
    .filter((membership) => membership.status === 'active' && membership.role === 'organizer')
    .map((membership) => membership.displayName);

const toOrganizerIds = (memberships: GroupMembership[]): string[] =>
  memberships
    .filter((membership) => membership.status === 'active' && membership.role === 'organizer')
    .map((membership) => membership.memberId);

const countActiveMembers = (memberships: GroupMembership[]): number =>
  memberships.filter((membership) => membership.status === 'active').length;

const cloneGroup = (group: Group): Group => ({
  ...group,
  organizerIds: [...group.organizerIds],
  members: [...group.members],
  organizers: [...group.organizers],
  membershipRequests: group.membershipRequests.map((request) => ({ ...request })),
  tags: group.tags?.map((tag) => ({ ...tag })),
  tagIds: group.tagIds ? [...group.tagIds] : undefined,
  memberships: group.memberships?.map(cloneMembership),
  location: group.location ? { ...group.location } : null
});

const cloneAttendee = (attendee: EventAttendee): EventAttendee => ({ ...attendee });

const cloneEvent = (event: Event): Event => ({
  ...event,
  tags: [...event.tags],
  tagIds: event.tagIds ? [...event.tagIds] : undefined,
  tagDetails: event.tagDetails?.map((tag) => ({ ...tag })),
  attendees: [...event.attendees],
  attendeeIds: event.attendeeIds ? [...event.attendeeIds] : undefined,
  attendeeRoster: event.attendeeRoster?.map(cloneAttendee)
});

const sampleGroups: Group[] = [
  {
    id: 'group-1',
    title: 'Seattle Alpine Collective',
    description:
      'Weekend summit bids, crevasse rescue refreshers, and community mentorship for climbers exploring the Cascade alpine.',
    ownerName: 'Dev User',
    ownerId: 'dev-user',
    organizerIds: toOrganizerIds(groupMemberships['group-1']),
    members: toActiveMembers(groupMemberships['group-1']),
    organizers: toOrganizers(groupMemberships['group-1']),
    bannerImage:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    logoImage:
      'https://images.unsplash.com/photo-1617379973555-625cf9c4cf57?auto=format&fit=crop&w=160&q=80',
    createdAt: '2023-05-12T16:00:00Z',
    updatedAt: '2024-06-01T09:00:00Z',
    subscriptionStatus: 'active',
    subscriptionExpiredAt: null,
    subscriptionRenewedAt: '2024-06-01T09:00:00Z',
    subscriptionUpdatedAt: '2024-06-01T09:00:00Z',
    subscriptionRenewalDate: '2024-08-01T00:00:00Z',
    monthlyFeeCents: 3900,
    membershipScreeningEnabled: true,
    membershipRequests: [
      {
        id: 'req-1',
        memberName: 'Jamie Fox',
        message: 'Looking forward to sunrise missions this season!',
        submittedAt: '2024-06-25T12:05:00Z',
        status: 'pending'
      }
    ],
    normalizedTitle: 'seattle-alpine-collective',
    tags: resolveTags(['tag-alpine', 'tag-backpacking']),
    tagIds: ['tag-alpine', 'tag-backpacking'],
    memberships: groupMemberships['group-1'].map(cloneMembership),
    memberCount: countActiveMembers(groupMemberships['group-1']),
    location: {
      city: 'Seattle',
      state: 'WA',
      region: 'Pacific Northwest',
      country: 'USA'
    }
  },
  {
    id: 'group-2',
    title: 'Puget Sound Kayakers',
    description:
      'Evening paddles, tidal current skills, and overnights on the Salish Sea for sea kayaking enthusiasts.',
    ownerName: 'Morgan Blake',
    ownerId: 'owner-2',
    organizerIds: toOrganizerIds(groupMemberships['group-2']),
    members: toActiveMembers(groupMemberships['group-2']),
    organizers: toOrganizers(groupMemberships['group-2']),
    bannerImage:
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80',
    logoImage:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=160&q=80',
    createdAt: '2022-04-02T09:00:00Z',
    updatedAt: '2024-05-18T10:15:00Z',
    subscriptionStatus: 'active',
    subscriptionExpiredAt: null,
    subscriptionRenewedAt: '2024-05-18T10:15:00Z',
    subscriptionUpdatedAt: '2024-05-18T10:15:00Z',
    subscriptionRenewalDate: '2024-07-18T00:00:00Z',
    monthlyFeeCents: 2900,
    membershipScreeningEnabled: false,
    membershipRequests: [],
    normalizedTitle: 'puget-sound-kayakers',
    tags: resolveTags(['tag-kayaking', 'tag-community']),
    tagIds: ['tag-kayaking', 'tag-community'],
    memberships: groupMemberships['group-2'].map(cloneMembership),
    memberCount: countActiveMembers(groupMemberships['group-2']),
    location: {
      city: 'Tacoma',
      state: 'WA',
      region: 'Puget Sound',
      country: 'USA'
    }
  },
  {
    id: 'group-3',
    title: 'Issaquah Trail Stewards',
    description:
      'Local volunteers restoring and maintaining Issaquah Alps trails with monthly stewardship days.',
    ownerName: 'Felicia Gomez',
    ownerId: 'owner-3',
    organizerIds: toOrganizerIds(groupMemberships['group-3']),
    members: toActiveMembers(groupMemberships['group-3']),
    organizers: toOrganizers(groupMemberships['group-3']),
    bannerImage:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
    logoImage:
      'https://images.unsplash.com/photo-1523978591478-c753949ff840?auto=format&fit=crop&w=160&q=80',
    createdAt: '2021-09-14T13:00:00Z',
    updatedAt: '2024-05-28T08:45:00Z',
    subscriptionStatus: 'active',
    subscriptionExpiredAt: null,
    subscriptionRenewedAt: '2024-05-01T00:00:00Z',
    subscriptionUpdatedAt: '2024-05-01T00:00:00Z',
    subscriptionRenewalDate: '2024-07-01T00:00:00Z',
    monthlyFeeCents: 0,
    membershipScreeningEnabled: true,
    membershipRequests: [
      {
        id: 'req-2',
        memberName: 'Elena Park',
        message: 'I lead volunteer crews with Washington Trails Association.',
        submittedAt: '2024-06-30T17:30:00Z',
        status: 'pending'
      }
    ],
    normalizedTitle: 'issaquah-trail-stewards',
    tags: resolveTags(['tag-trailwork', 'tag-community']),
    tagIds: ['tag-trailwork', 'tag-community'],
    memberships: groupMemberships['group-3'].map(cloneMembership),
    memberCount: countActiveMembers(groupMemberships['group-3']),
    location: {
      city: 'Issaquah',
      state: 'WA',
      region: 'Eastside',
      country: 'USA'
    }
  }
];

const createAttendeeRoster = (
  eventId: string,
  attendees: Array<{
    attendeeId: string;
    displayName: string;
    status: EventAttendee['status'];
    respondedAt?: string;
  }>
): EventAttendee[] =>
  attendees.map((attendee) => ({
    attendeeId: attendee.attendeeId,
    displayName: attendee.displayName,
    status: attendee.status,
    respondedAt: attendee.respondedAt ?? null
  }));

const toConfirmedNames = (attendees: EventAttendee[]): string[] =>
  attendees.filter((attendee) => attendee.status === 'confirmed').map((attendee) => attendee.displayName);

const toConfirmedIds = (attendees: EventAttendee[]): string[] =>
  attendees.filter((attendee) => attendee.status === 'confirmed').map((attendee) => attendee.attendeeId);

const sampleEvents: Event[] = [
  (() => {
    const attendeeRoster = createAttendeeRoster('event-1', [
      {
        attendeeId: 'dev-user',
        displayName: 'Dev User',
        status: 'confirmed',
        respondedAt: '2024-06-20T15:00:00Z'
      },
      {
        attendeeId: 'member-1',
        displayName: 'Robin Singh',
        status: 'confirmed',
        respondedAt: '2024-06-22T13:45:00Z'
      },
      {
        attendeeId: 'member-4',
        displayName: 'Skyler James',
        status: 'confirmed',
        respondedAt: '2024-06-28T11:10:00Z'
      },
      {
        attendeeId: 'waitlist-1',
        displayName: 'Mina Ochoa',
        status: 'waitlist',
        respondedAt: '2024-07-01T08:30:00Z'
      }
    ]);

    const tagIds = ['tag-alpine', 'tag-education'];

    return {
      id: 'event-1',
      title: 'Sunrise summit of Mount Fremont',
      description:
        'Alpine start from Sunrise parking with rope teams reviewing glacier travel skills en route to the summit.',
      location: 'Mount Rainier National Park, WA',
      startDate: '2024-07-12T05:30:00Z',
      endDate: '2024-07-12T12:30:00Z',
      hostName: 'Dev User',
      capacity: 12,
      tags: resolveTags(tagIds).map((tag) => tag.label),
      tagIds,
      tagDetails: resolveTags(tagIds),
      attendees: toConfirmedNames(attendeeRoster),
      attendeeIds: toConfirmedIds(attendeeRoster),
      attendeeRoster,
      bannerImage:
        'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=900&q=80',
      groupId: 'group-1',
      groupTitle: 'Seattle Alpine Collective',
      createdAt: '2024-06-15T16:00:00Z',
      createdById: 'dev-user',
      feeAmountCents: 1500,
      feeCurrency: 'USD',
      feeDescription: 'Covers permits and shared breakfast burritos at the trailhead.',
      feeDisclosure:
        'A fee applies to cover permits, shared supplies, and guide support for this adventure.',
      isVisible: true,
      hiddenReason: null,
      hiddenAt: null
    } satisfies Event;
  })(),
  (() => {
    const attendeeRoster = createAttendeeRoster('event-2', [
      {
        attendeeId: 'dev-user',
        displayName: 'Dev User',
        status: 'confirmed',
        respondedAt: '2024-06-18T20:22:00Z'
      },
      {
        attendeeId: 'member-2',
        displayName: 'Noor Patel',
        status: 'confirmed',
        respondedAt: '2024-06-21T11:05:00Z'
      },
      {
        attendeeId: 'member-3',
        displayName: 'Taylor Reed',
        status: 'confirmed',
        respondedAt: '2024-06-23T09:30:00Z'
      },
      {
        attendeeId: 'guest-1',
        displayName: 'Marta Jensen',
        status: 'confirmed',
        respondedAt: '2024-06-25T18:40:00Z'
      }
    ]);

    const tagIds = ['tag-kayaking', 'tag-campfire'];

    return {
      id: 'event-2',
      title: 'Friday night paddle & campfire',
      description:
        'Casual paddle across the bay before landing on a small island for s\'mores and swapping trip ideas.',
      location: 'Lake Crescent, WA',
      startDate: '2024-07-19T18:00:00Z',
      endDate: '2024-07-20T02:00:00Z',
      hostName: 'Morgan Blake',
      capacity: 16,
      tags: resolveTags(tagIds).map((tag) => tag.label),
      tagIds,
      tagDetails: resolveTags(tagIds),
      attendees: toConfirmedNames(attendeeRoster),
      attendeeIds: toConfirmedIds(attendeeRoster),
      attendeeRoster,
      bannerImage:
        'https://images.unsplash.com/photo-1493589976221-c2357c31ad77?auto=format&fit=crop&w=900&q=80',
      groupId: 'group-2',
      groupTitle: 'Puget Sound Kayakers',
      createdAt: '2024-06-10T18:00:00Z',
      createdById: 'owner-2',
      feeAmountCents: 0,
      feeCurrency: null,
      feeDescription: null,
      feeDisclosure: null,
      isVisible: true,
      hiddenReason: null,
      hiddenAt: null
    } satisfies Event;
  })(),
  (() => {
    const attendeeRoster = createAttendeeRoster('event-3', [
      {
        attendeeId: 'dev-user',
        displayName: 'Dev User',
        status: 'confirmed',
        respondedAt: '2024-06-24T14:00:00Z'
      },
      {
        attendeeId: 'volunteer-1',
        displayName: 'Elena Park',
        status: 'waitlist',
        respondedAt: '2024-06-30T17:45:00Z'
      },
      {
        attendeeId: 'volunteer-2',
        displayName: 'Carlos Mendes',
        status: 'waitlist',
        respondedAt: '2024-07-01T09:15:00Z'
      }
    ]);

    const tagIds = ['tag-trailwork', 'tag-community'];

    return {
      id: 'event-3',
      title: 'Trail stewardship morning',
      description:
        'Clearing drainages and brushing on the High School Trail before celebrating with coffee at the trailhead.',
      location: 'Cougar Mountain, WA',
      startDate: '2024-07-27T08:00:00Z',
      endDate: '2024-07-27T12:00:00Z',
      hostName: 'Felicia Gomez',
      capacity: 8,
      tags: resolveTags(tagIds).map((tag) => tag.label),
      tagIds,
      tagDetails: resolveTags(tagIds),
      attendees: toConfirmedNames(attendeeRoster),
      attendeeIds: toConfirmedIds(attendeeRoster),
      attendeeRoster,
      bannerImage:
        'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80',
      groupId: 'group-3',
      groupTitle: 'Issaquah Trail Stewards',
      createdAt: '2024-06-05T12:30:00Z',
      createdById: 'owner-3',
      feeAmountCents: 0,
      feeCurrency: null,
      feeDescription: null,
      feeDisclosure: null,
      isVisible: true,
      hiddenReason: null,
      hiddenAt: null
    } satisfies Event;
  })(),
  (() => {
    const attendeeRoster = createAttendeeRoster('event-4', [
      {
        attendeeId: 'dev-user',
        displayName: 'Dev User',
        status: 'confirmed',
        respondedAt: '2024-06-26T07:50:00Z'
      }
    ]);

    const tagIds = ['tag-route-setting', 'tag-education'];

    return {
      id: 'event-4',
      title: 'Route-setting workshop',
      description:
        'Hands-on session at the community gym covering safety checks, hold selection, and forerunning best practices.',
      location: 'Seattle Bouldering Project, WA',
      startDate: '2024-08-02T17:30:00Z',
      endDate: '2024-08-02T20:30:00Z',
      hostName: 'Avery Johnson',
      capacity: 10,
      tags: resolveTags(tagIds).map((tag) => tag.label),
      tagIds,
      tagDetails: resolveTags(tagIds),
      attendees: toConfirmedNames(attendeeRoster),
      attendeeIds: toConfirmedIds(attendeeRoster),
      attendeeRoster,
      bannerImage:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80',
      groupId: 'group-1',
      groupTitle: 'Seattle Alpine Collective',
      createdAt: '2024-06-24T10:00:00Z',
      createdById: 'organizer-2',
      feeAmountCents: 0,
      feeCurrency: null,
      feeDescription: null,
      feeDisclosure: null,
      isVisible: false,
      hiddenReason: 'subscription_expired',
      hiddenAt: '2024-06-24T10:00:00Z'
    } satisfies Event;
  })()
];

const directoryEntries: LocalDirectoryEntry[] = [
  {
    id: 'directory-1',
    name: 'Summit Outfitters',
    description: 'Rental alpine kits, avalanche education, and trip planning consultations based in Ballard.',
    category: 'gear-shop',
    city: 'Seattle',
    state: 'WA',
    url: 'https://example.com/summit-outfitters',
    imageUrl: 'https://images.unsplash.com/photo-1510867759970-4b3016ad3efa?auto=format&fit=crop&w=900&q=80',
    affiliatedGroupIds: ['group-1'],
    tags: resolveTags(['tag-gear', 'tag-education']),
    tagIds: ['tag-gear', 'tag-education']
  },
  {
    id: 'directory-2',
    name: 'Salish Sea Guide Collective',
    description: 'AMGA-certified guides leading multi-day paddling expeditions around the Puget Sound.',
    category: 'guide-service',
    city: 'Tacoma',
    state: 'WA',
    url: 'https://example.com/salish-sea-guides',
    imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
    affiliatedGroupIds: ['group-2'],
    tags: resolveTags(['tag-kayaking', 'tag-education']),
    tagIds: ['tag-kayaking', 'tag-education']
  },
  {
    id: 'directory-3',
    name: 'Eastside Trail Friends',
    description: 'Volunteer crews coordinating monthly maintenance projects throughout the Issaquah Alps.',
    category: 'volunteer',
    city: 'Issaquah',
    state: 'WA',
    url: 'https://example.com/eastside-trail-friends',
    imageUrl: 'https://images.unsplash.com/photo-1455659817273-f96807779a8d?auto=format&fit=crop&w=900&q=80',
    affiliatedGroupIds: ['group-3'],
    tags: resolveTags(['tag-trailwork', 'tag-community']),
    tagIds: ['tag-trailwork', 'tag-community']
  }
];

const simulateFetch = async <T>(data: T): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, 180));
  return data;
};

const determineRoleFromGroup = (group: Group, userId: string): DashboardGroupRole => {
  if (group.ownerId === userId) {
    return 'owner';
  }

  if (group.organizerIds.includes(userId)) {
    return 'organizer';
  }

  const rosterEntry = group.memberships?.find(
    (membership) => membership.memberId === userId && membership.status === 'active'
  );

  if (rosterEntry?.role === 'organizer') {
    return 'organizer';
  }

  return 'member';
};

const sampleGroupsById = new Map(sampleGroups.map((group) => [group.id, group] as const));

const getNextEventForGroup = (
  events: Event[],
  groupId: string
): DashboardGroupSummary['nextEvent'] => {
  const now = new Date();

  const upcoming = events
    .filter((event) => event.groupId === groupId)
    .filter((event) => {
      const start = new Date(event.startDate);
      return Number.isFinite(start.getTime()) && start >= now;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (upcoming.length === 0) {
    return null;
  }

  const next = upcoming[0];
  return {
    id: next.id,
    title: next.title,
    startDate: next.startDate
  };
};

const formatAttendeeSummary = (event: Event): string => {
  const confirmedCount = event.attendees.length;
  if (!event.isVisible) {
    return 'Draft saved — publish to invite members';
  }

  if (!event.capacity) {
    return `${confirmedCount} RSVPs`;
  }

  const capacityRemaining = Math.max(event.capacity - confirmedCount, 0);

  if (capacityRemaining === 0) {
    const waitlistCount = event.attendeeRoster?.filter((attendee) => attendee.status === 'waitlist')
      .length;
    return waitlistCount && waitlistCount > 0
      ? `Waitlist with ${waitlistCount} pending`
      : `${confirmedCount} of ${event.capacity} spots filled`;
  }

  return `${confirmedCount} of ${event.capacity} spots filled`;
};

const computeEventStatus = (event: Event): DashboardEventStatus => {
  if (!event.isVisible) {
    return 'draft';
  }

  if (event.capacity && event.attendees.length >= event.capacity) {
    return 'waitlist';
  }

  return 'open';
};

export const fetchUserGroups = async (
  userId: string | null | undefined
): Promise<Group[]> => {
  if (!userId) {
    return [];
  }

  const groups = sampleGroups.filter((group) => {
    if (group.ownerId === userId) {
      return true;
    }

    if (group.organizerIds.includes(userId)) {
      return true;
    }

    return group.memberships?.some(
      (membership) => membership.memberId === userId && membership.status === 'active'
    );
  });

  return simulateFetch(groups.map(cloneGroup));
};

export const fetchUserEvents = async (
  userId: string | null | undefined,
  options: FetchUserEventsOptions = {}
): Promise<Event[]> => {
  if (!userId) {
    return [];
  }

  const { groupIds, includeHidden = true } = options;
  const allowedGroupIds = groupIds ? new Set(groupIds) : null;

  const events = sampleEvents.filter((event) => {
    if (allowedGroupIds && !allowedGroupIds.has(event.groupId)) {
      return false;
    }

    if (!includeHidden && !event.isVisible) {
      return false;
    }

    if (event.createdById === userId) {
      return true;
    }

    const group = sampleGroupsById.get(event.groupId);
    if (!group) {
      return false;
    }

    if (group.ownerId === userId || group.organizerIds.includes(userId)) {
      return true;
    }

    return false;
  });

  return simulateFetch(events.map(cloneEvent));
};

export const fetchLocalDirectories = async (
  filters: LocalDirectoryFilters = {}
): Promise<LocalDirectoryEntry[]> => {
  const { state, tagId, category, limit } = filters;

  const entries = directoryEntries.filter((entry) => {
    if (state && entry.state !== state) {
      return false;
    }

    if (category && entry.category !== category) {
      return false;
    }

    if (tagId && !entry.tagIds.includes(tagId)) {
      return false;
    }

    return true;
  });

  const limited = typeof limit === 'number' ? entries.slice(0, Math.max(limit, 0)) : entries;

  return simulateFetch(
    limited.map((entry) => ({
      ...entry,
      tags: entry.tags.map((tag) => ({ ...tag })),
      tagIds: [...entry.tagIds],
      affiliatedGroupIds: entry.affiliatedGroupIds ? [...entry.affiliatedGroupIds] : undefined
    }))
  );
};

export const fetchDashboardActivity = async (
  userId: string | null | undefined
): Promise<DashboardActivityResponse> => {
  if (!userId) {
    return { groups: [], events: [] };
  }

  const groups = await fetchUserGroups(userId);
  const groupIds = groups.map((group) => group.id);
  const events = await fetchUserEvents(userId, { groupIds, includeHidden: true });

  const groupSummaries: DashboardGroupSummary[] = groups.map((group) => ({
    id: group.id,
    name: group.title,
    city: group.location?.city ?? '—',
    state: group.location?.state ?? '—',
    memberCount: group.memberCount ?? group.members.length,
    role: determineRoleFromGroup(group, userId),
    coverImageUrl: group.bannerImage,
    nextEvent: getNextEventForGroup(events, group.id)
  }));

  const eventSummaries: DashboardEventSummary[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    groupId: event.groupId,
    groupName: event.groupTitle,
    startDate: event.startDate,
    location: event.location,
    attendeeSummary: formatAttendeeSummary(event),
    status: computeEventStatus(event)
  }));

  return { groups: groupSummaries, events: eventSummaries };
};

