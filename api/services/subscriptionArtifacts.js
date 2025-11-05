const INACTIVE_STATUSES = new Set(['canceled', 'past_due', 'none']);
const SUBSCRIPTION_ACTIVE_STATUS = 'active';
export const SUBSCRIPTION_HIDDEN_REASON = 'subscription_expired';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      return null;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isSubscriptionInactive = (status) => INACTIVE_STATUSES.has(status ?? 'none');

export const canCreateGroupWithStatus = (status) => status === SUBSCRIPTION_ACTIVE_STATUS;

export const computeGroupSubscriptionUpdate = ({
  currentStatus,
  nextStatus,
  currentExpiredAt,
  now = new Date()
}) => {
  const wasInactive = isSubscriptionInactive(currentStatus);
  const isInactive = isSubscriptionInactive(nextStatus);
  const next = {
    subscriptionStatus: nextStatus,
    subscriptionUpdatedAt: now.toISOString()
  };

  if (!wasInactive && isInactive) {
    next.subscriptionExpiredAt = now.toISOString();
    next.subscriptionRenewedAt = null;
  } else if (wasInactive && !isInactive) {
    next.subscriptionExpiredAt = null;
    next.subscriptionRenewedAt = now.toISOString();
  } else if (currentExpiredAt) {
    const existing = toDate(currentExpiredAt);
    next.subscriptionExpiredAt = existing ? existing.toISOString() : null;
  }

  return next;
};

export const deriveEventVisibilityChanges = ({
  events,
  expiredAt,
  isInactive,
  now = new Date()
}) => {
  const threshold = expiredAt ?? now;
  const toHide = [];
  const toRestore = [];

  events.forEach((event) => {
    const createdAt = toDate(event.createdAt);
    const hiddenReason = event.hiddenReason ?? null;
    const isVisible = event.isVisible !== false;

    if (isInactive) {
      if (
        createdAt &&
        createdAt >= threshold &&
        (isVisible || hiddenReason !== SUBSCRIPTION_HIDDEN_REASON)
      ) {
        toHide.push(event.id);
      }
    } else if (hiddenReason === SUBSCRIPTION_HIDDEN_REASON) {
      toRestore.push(event.id);
    }
  });

  return { toHide, toRestore };
};

export const mapExpiryIsoToDate = (value) => {
  const date = toDate(value);
  return date;
};

export default {
  INACTIVE_STATUSES,
  SUBSCRIPTION_HIDDEN_REASON,
  isSubscriptionInactive,
  canCreateGroupWithStatus,
  computeGroupSubscriptionUpdate,
  deriveEventVisibilityChanges,
  mapExpiryIsoToDate
};
