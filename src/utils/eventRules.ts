import type { Group } from '../types/group';

export const SUBSCRIPTION_HIDDEN_REASON = 'subscription_expired';

export const isGroupSubscriptionActive = (
  group: Pick<Group, 'subscriptionStatus' | 'subscriptionExpiredAt'>
): boolean => {
  const status = group.subscriptionStatus ?? 'none';
  if (status !== 'active') {
    return false;
  }
  return !group.subscriptionExpiredAt;
};

export const userCanManageGroup = (
  group: Pick<Group, 'ownerId' | 'organizerIds'>,
  userId?: string | null
): boolean => {
  if (!userId) {
    return false;
  }
  if (group.ownerId && group.ownerId === userId) {
    return true;
  }

  return Array.isArray(group.organizerIds) && group.organizerIds.includes(userId);
};

export interface EventFeeInput {
  amount?: string | number | null;
  currency?: string | null;
  description?: string | null;
  disclosure?: string | null;
}

export interface NormalizedEventFee {
  amountCents: number | null;
  currency: string | null;
  description: string | null;
  disclosure: string | null;
}

const DEFAULT_FEE_DISCLOSURE =
  'A fee applies to cover permits, shared supplies, and guide support for this adventure.';

const toNumber = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed.replace(/[^0-9.,-]/g, '').replace(/,/g, '.'));
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }
  return null;
};

export const normalizeEventFee = ({
  amount,
  currency,
  description,
  disclosure
}: EventFeeInput): NormalizedEventFee => {
  const numericAmount = toNumber(amount);
  if (numericAmount === null || numericAmount <= 0) {
    return {
      amountCents: null,
      currency: null,
      description: null,
      disclosure: null
    };
  }

  const cents = Math.round(numericAmount * 100);
  const normalizedCurrency = currency?.trim().toUpperCase() || 'USD';
  const normalizedDescription = description?.trim() || null;
  const normalizedDisclosure = disclosure?.trim() || DEFAULT_FEE_DISCLOSURE;

  return {
    amountCents: Math.max(0, cents),
    currency: normalizedCurrency,
    description: normalizedDescription,
    disclosure: normalizedDisclosure
  };
};

export interface VisibilityInput {
  group: Pick<Group, 'subscriptionStatus' | 'subscriptionExpiredAt'>;
  now?: Date;
}

export interface VisibilityResult {
  isVisible: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
}

export const deriveInitialEventVisibility = ({
  group,
  now = new Date()
}: VisibilityInput): VisibilityResult => {
  if (isGroupSubscriptionActive(group)) {
    return {
      isVisible: true,
      hiddenReason: null,
      hiddenAt: null
    };
  }

  return {
    isVisible: false,
    hiddenReason: SUBSCRIPTION_HIDDEN_REASON,
    hiddenAt: now.toISOString()
  };
};
