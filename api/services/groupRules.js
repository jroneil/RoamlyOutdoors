export const normalizeGroupTitle = (title) =>
  String(title ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const INACTIVE_STATUSES = new Set(['canceled', 'past_due', 'none']);

export const isSubscriptionInactive = (status) => INACTIVE_STATUSES.has(status ?? 'none');

export const computeGroupSubscriptionTransition = ({
  currentStatus,
  nextStatus,
  currentExpiredAt,
  now = new Date()
}) => {
  const wasInactive = isSubscriptionInactive(currentStatus);
  const willBeInactive = isSubscriptionInactive(nextStatus);
  const timestampIso = now.toISOString();

  const next = {
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
    const existing = currentExpiredAt instanceof Date ? currentExpiredAt : new Date(currentExpiredAt);
    next.subscriptionExpiredAt = Number.isNaN(existing.getTime()) ? null : existing.toISOString();
  }

  return next;
};

export const hasAvailableGroupCapacity = (quota, ownedGroupCount) => {
  if (!quota || quota <= 0) {
    return true;
  }

  return ownedGroupCount < quota;
};

export const OwnershipTransferBlockReason = {
  INACTIVE_SUBSCRIPTION: 'inactive_subscription',
  CAPACITY_EXCEEDED: 'capacity_exceeded',
  SAME_OWNER: 'same_owner'
};

export const validateOwnershipTransfer = ({ incomingStatus, hasCapacity, isSameOwner }) => {
  if (isSameOwner) {
    return { allowed: false, reason: OwnershipTransferBlockReason.SAME_OWNER };
  }

  if (isSubscriptionInactive(incomingStatus)) {
    return { allowed: false, reason: OwnershipTransferBlockReason.INACTIVE_SUBSCRIPTION };
  }

  if (!hasCapacity) {
    return { allowed: false, reason: OwnershipTransferBlockReason.CAPACITY_EXCEEDED };
  }

  return { allowed: true };
};

export default {
  normalizeGroupTitle,
  isSubscriptionInactive,
  computeGroupSubscriptionTransition,
  hasAvailableGroupCapacity,
  OwnershipTransferBlockReason,
  validateOwnershipTransfer
};
