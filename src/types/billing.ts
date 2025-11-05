import type { PlanEntitlements } from './user';

export type CreditLedgerTransactionType = 'credit' | 'debit' | 'adjustment';

export interface CreditLedgerTransaction {
  id: string;
  type: CreditLedgerTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  occurredAt: string;
}

export interface CreditReplenishmentSettings {
  mode: 'auto' | 'manual';
  threshold: number;
  bundleId: string;
}

export interface CreditLedger {
  balance: number;
  history: CreditLedgerTransaction[];
  replenishment: CreditReplenishmentSettings;
  lastUpdatedAt: string | null;
  lastAutoPurchaseAt: string | null;
  lowBalanceEmailSentAt: string | null;
}

export interface CreditUsageSnapshot {
  monthlyLimit: number;
  monthlyUsed: number;
  cycleStartedAt: string | null;
  cycleRenewsOn: string | null;
  lastUpdatedAt: string | null;
}

export interface CreditBundle {
  id: string;
  name: string;
  description: string;
  credits: number;
  priceCents: number;
  currency: string;
  isRecommended?: boolean;
}

export const createDefaultCreditReplenishmentSettings = (): CreditReplenishmentSettings => ({
  mode: 'manual',
  threshold: 5,
  bundleId: ''
});

export const createDefaultCreditLedger = (): CreditLedger => ({
  balance: 0,
  history: [],
  replenishment: createDefaultCreditReplenishmentSettings(),
  lastUpdatedAt: null,
  lastAutoPurchaseAt: null,
  lowBalanceEmailSentAt: null
});

export const createDefaultCreditUsage = (): CreditUsageSnapshot => ({
  monthlyLimit: 0,
  monthlyUsed: 0,
  cycleStartedAt: null,
  cycleRenewsOn: null,
  lastUpdatedAt: null
});

export const createCreditBundle = (overrides: Partial<CreditBundle> = {}): CreditBundle => ({
  id: overrides.id ?? '',
  name: overrides.name ?? 'Custom bundle',
  description: overrides.description ?? '',
  credits: overrides.credits ?? 0,
  priceCents: overrides.priceCents ?? 0,
  currency: overrides.currency ?? 'usd',
  isRecommended: overrides.isRecommended ?? false
});

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
