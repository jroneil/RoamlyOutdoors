import type { SubscriptionStatus } from './user';

export interface Group {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  ownerId?: string;
  members: string[];
  bannerImage?: string;
  logoImage?: string;
  createdAt: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiredAt?: string | null;
  subscriptionRenewedAt?: string | null;
  subscriptionUpdatedAt?: string | null;
  subscriptionRenewalDate?: string | null;
}

export type GroupFormValues = Omit<
  Group,
  | 'id'
  | 'members'
  | 'createdAt'
  | 'subscriptionStatus'
  | 'subscriptionExpiredAt'
  | 'subscriptionRenewedAt'
  | 'subscriptionUpdatedAt'
  | 'subscriptionRenewalDate'
  | 'ownerId'
> & {
  members?: string[];
};
