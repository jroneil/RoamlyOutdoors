import type { Tag } from './tag';
import type { SubscriptionStatus } from './user';

export type GroupRole = 'owner' | 'organizer' | 'member';

export type GroupMembershipStatus = 'active' | 'invited' | 'pending';

export interface GroupLocation {
  city: string;
  state: string;
  region?: string | null;
  country?: string | null;
}

export interface GroupMembership {
  id: string;
  memberId: string;
  displayName: string;
  role: GroupRole;
  status: GroupMembershipStatus;
  joinedAt?: string | null;
  invitedAt?: string | null;
}

export interface MembershipRequest {
  id: string;
  memberName: string;
  message?: string;
  submittedAt: string;
  status?: 'pending' | 'approved' | 'declined';
}

export interface Group {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  ownerId?: string;
  organizerIds: string[];
  members: string[];
  organizers: string[];
  bannerImage?: string;
  logoImage?: string;
  createdAt: string;
  updatedAt?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiredAt?: string | null;
  subscriptionRenewedAt?: string | null;
  subscriptionUpdatedAt?: string | null;
  subscriptionRenewalDate?: string | null;
  monthlyFeeCents: number;
  membershipScreeningEnabled: boolean;
  membershipRequests: MembershipRequest[];
  normalizedTitle?: string;
  /** Optional normalized tag metadata associated with the group */
  tags?: Tag[];
  /** Tag identifiers allow dashboards to cross-reference related resources */
  tagIds?: string[];
  /** Structured roster information for downstream dashboards */
  memberships?: GroupMembership[];
  /** Cached count of active members for quick summaries */
  memberCount?: number;
  /** Location metadata helps surface nearby directories */
  location?: GroupLocation | null;
}

export type GroupFormValues = Omit<
  Group,
  | 'id'
  | 'members'
  | 'organizerIds'
  | 'createdAt'
  | 'subscriptionStatus'
  | 'subscriptionExpiredAt'
  | 'subscriptionRenewedAt'
  | 'subscriptionUpdatedAt'
  | 'subscriptionRenewalDate'
  | 'ownerId'
  | 'membershipRequests'
  | 'normalizedTitle'
  | 'tags'
  | 'tagIds'
  | 'memberships'
  | 'memberCount'
  | 'location'
  | 'updatedAt'
> & {
  members?: string[];
};
