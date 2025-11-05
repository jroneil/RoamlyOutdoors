import type { PlanEntitlements } from './user';

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  unitAmount: number;
  currency: string;
  interval: 'month' | 'year';
  entitlements: PlanEntitlements;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
}
