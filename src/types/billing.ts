export interface CreditBundle {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  highlight?: string;
}

export type CreditReplenishmentMode = 'auto' | 'reminder';

export interface CreditReplenishmentSettings {
  mode: CreditReplenishmentMode;
  threshold: number;
  bundleId: string;
}

export interface CreditLedger {
  balance: number;
  lastUpdated: string;
  lowBalanceThreshold: number;
  lowBalanceEmailSentAt?: string | null;
  lastAutoPurchaseAt?: string | null;
  replenishment: CreditReplenishmentSettings;
}

export interface CreditUsageSnapshot {
  monthlyLimit: number;
  monthlyUsed: number;
  cycleRenewsOn: string;
}

export const createDefaultCreditReplenishment = (): CreditReplenishmentSettings => ({
  mode: 'reminder',
  threshold: 3,
  bundleId: 'bundle_starter'
});

export const createDefaultCreditLedger = (): CreditLedger => ({
  balance: 5,
  lastUpdated: new Date().toISOString(),
  lowBalanceThreshold: 3,
  lowBalanceEmailSentAt: null,
  lastAutoPurchaseAt: null,
  replenishment: createDefaultCreditReplenishment()
});

export const createDefaultCreditUsage = (): CreditUsageSnapshot => ({
  monthlyLimit: 20,
  monthlyUsed: 0,
  cycleRenewsOn: new Date().toISOString()
});
