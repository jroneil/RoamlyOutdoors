export type UserRole = 'member' | 'organizer' | 'admin';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface BillingProfile {
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionStatus;
  packageName?: string;
  renewalDate?: string;
  managedBy?: 'stripe' | 'manual';
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
  subscriptionStatus: 'none'
};

export const DEFAULT_USER_DTO: UserDTO = {
  role: 'member',
  contactEmail: '',
  billing: DEFAULT_BILLING_PROFILE,
  organizationName: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
