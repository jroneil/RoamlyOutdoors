import type { SubscriptionStatus } from '../types/user';

export const normalizeGroupTitle = (title: string): string =>
  title
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const isSubscriptionInactive = (status: SubscriptionStatus | undefined | null): boolean => {
  const normalized = status ?? 'none';
  return normalized === 'canceled' || normalized === 'past_due' || normalized === 'none';
};

interface SubscriptionTransitionInput {
  currentStatus: SubscriptionStatus | undefined;
  nextStatus: SubscriptionStatus | undefined;
  currentExpiredAt?: string | Date | null;
  now?: Date;
}

interface SubscriptionTransitionOutput {
  subscriptionStatus: SubscriptionStatus | undefined;
  subscriptionExpiredAt?: string | null;
  subscriptionRenewedAt?: string | null;
  subscriptionUpdatedAt: string;
}

export const computeGroupSubscriptionTransition = ({
  currentStatus,
  nextStatus,
  currentExpiredAt,
  now = new Date()
}: SubscriptionTransitionInput): SubscriptionTransitionOutput => {
  const wasInactive = isSubscriptionInactive(currentStatus ?? 'none');
  const willBeInactive = isSubscriptionInactive(nextStatus ?? 'none');
  const timestampIso = now.toISOString();

  const next: SubscriptionTransitionOutput = {
    subscriptionStatus: nextStatus,
    subscriptionUpdatedAt: timestampIso
  };

  if (!wasInactive && willBeInactive) {
    next.subscriptionExpiredAt = timestampIso;
    next.subscriptionRenewedAt = null;
  } else if (wasInactive && !willBeInactive) {
    next.subscriptionExpiredAt = null;
    next.subscriptionRenewedAt = timestampIso;
  } else if (currentExpiredAt) {
    const existingDate =
      typeof currentExpiredAt === 'string'
        ? new Date(currentExpiredAt)
        : currentExpiredAt instanceof Date
        ? currentExpiredAt
        : null;
    next.subscriptionExpiredAt = existingDate && !Number.isNaN(existingDate.valueOf())
      ? existingDate.toISOString()
      : null;
  }

  return next;
};

export const hasAvailableGroupCapacity = (
  quota: number | null | undefined,
  ownedGroupCount: number
): boolean => {
  if (!quota || quota <= 0) {
    return true;
  }

  return ownedGroupCount < quota;
};

export type OwnershipTransferBlockReason =
  | 'inactive_subscription'
  | 'capacity_exceeded'
  | 'same_owner';

interface OwnershipTransferCheck {
  incomingStatus: SubscriptionStatus | undefined;
  hasCapacity: boolean;
  isSameOwner: boolean;
}

export const validateOwnershipTransfer = ({
  incomingStatus,
  hasCapacity,
  isSameOwner
}: OwnershipTransferCheck): { allowed: boolean; reason?: OwnershipTransferBlockReason } => {
  if (isSameOwner) {
    return { allowed: false, reason: 'same_owner' };
  }

  if (isSubscriptionInactive(incomingStatus ?? 'none')) {
    return { allowed: false, reason: 'inactive_subscription' };
  }

  if (!hasCapacity) {
    return { allowed: false, reason: 'capacity_exceeded' };
  }

  return { allowed: true };
};
