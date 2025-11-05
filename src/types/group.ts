import type { SubscriptionStatus } from './user';

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
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiredAt?: string | null;
  subscriptionRenewedAt?: string | null;
  subscriptionUpdatedAt?: string | null;
  subscriptionRenewalDate?: string | null;
  monthlyFeeCents: number;
  membershipScreeningEnabled: boolean;
  membershipRequests: MembershipRequest[];
  normalizedTitle?: string;
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
> & {
  members?: string[];
};
