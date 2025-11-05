import type { CreditLedger, CreditUsageSnapshot } from './billing';
import { createDefaultCreditLedger, createDefaultCreditUsage } from './billing';

export { createDefaultCreditLedger, createDefaultCreditUsage } from './billing';

export type UserRole = 'member' | 'organizer' | 'admin';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface PlanEntitlements {
  maxEventsPerMonth: number;
  teamSeats: number;
  supportLevel: 'community' | 'priority' | 'concierge';
}

export interface BillingProfile {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  packageName?: string;
  planId?: string | null;
  renewalDate?: string | null;
  managedBy?: 'stripe' | 'manual';
  entitlements?: PlanEntitlements | null;
  lastInvoiceStatus?: string | null;
  lastInvoiceUrl?: string | null;
  lastPaymentError?: string | null;
  credits: CreditLedger;
  usage: CreditUsageSnapshot;
}

export interface UserDTO {
  role: UserRole;
  contactEmail: string;
  billing: BillingProfile;
  organizationName?: string;
  updatedAt: string;
  createdAt: string;
}

export interface AppUser extends UserDTO {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export const DEFAULT_BILLING_PROFILE: BillingProfile = {
  subscriptionStatus: 'none',
  managedBy: 'manual',
  renewalDate: null,
  entitlements: null,
  credits: createDefaultCreditLedger(),
  usage: createDefaultCreditUsage()
};

export const DEFAULT_USER_DTO: UserDTO = {
  role: 'member',
  contactEmail: '',
  billing: DEFAULT_BILLING_PROFILE,
  organizationName: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
