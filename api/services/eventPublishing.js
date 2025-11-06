import { randomUUID } from 'node:crypto';
import { getFirebaseAdmin, getFirestore } from '../firebaseAdmin.js';

class EventPublishingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EventPublishingError';
  }
}

export class FirestoreUnavailableError extends EventPublishingError {
  constructor(message = 'Event publishing service is unavailable.') {
    super(message);
    this.name = 'FirestoreUnavailableError';
  }
}

export class MissingGroupAssociationError extends EventPublishingError {
  constructor(message = 'A valid group is required to create an event.') {
    super(message);
    this.name = 'MissingGroupAssociationError';
  }
}

export class UnauthorizedEventCreatorError extends EventPublishingError {
  constructor(message = 'You must be an owner or organizer of this group to publish events.') {
    super(message);
    this.name = 'UnauthorizedEventCreatorError';
  }
}

export class InsufficientCreditsError extends EventPublishingError {
  constructor(message = 'You do not have enough credits to publish this event.') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export class SubscriptionInactiveError extends EventPublishingError {
  constructor(message = 'The selected group needs an active subscription to publish events.') {
    super(message);
    this.name = 'SubscriptionInactiveError';
  }
}

export class InvalidEventInputError extends EventPublishingError {
  constructor(message = 'Event details are invalid.') {
    super(message);
    this.name = 'InvalidEventInputError';
  }
}

const ensureFirestore = (provided) => {
  const firestore = provided ?? getFirestore();
  if (!firestore) {
    throw new FirestoreUnavailableError();
  }
  return firestore;
};

const normalizeId = (value) => (typeof value === 'string' ? value.trim() : '');

const toUniqueStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const entry of value) {
    const normalized = normalizeId(entry);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const isGroupSubscriptionActive = (group) => {
  const status = typeof group.subscriptionStatus === 'string' ? group.subscriptionStatus : 'none';
  if (status !== 'active') {
    return false;
  }
  return !group.subscriptionExpiredAt;
};

const userCanManageGroup = (group, userId) => {
  if (!userId) {
    return false;
  }
  const ownerId = normalizeId(group.ownerId);
  if (ownerId && ownerId === userId) {
    return true;
  }

  const organizerIds = new Set([
    ...toUniqueStringArray(group.organizerIds),
    ...toUniqueStringArray(group.organizers)
  ]);

  return organizerIds.has(userId);
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const toNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed.replace(/[^0-9.,-]/g, '').replace(/,/g, '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeEventFee = ({ amount, currency, description, disclosure }) => {
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
  const normalizedDisclosure = disclosure?.trim() ||
    'A fee applies to cover permits, shared supplies, and guide support for this adventure.';

  return {
    amountCents: Math.max(0, cents),
    currency: normalizedCurrency,
    description: normalizedDescription,
    disclosure: normalizedDisclosure
  };
};

const deriveInitialVisibility = (group, now) => {
  if (isGroupSubscriptionActive(group)) {
    return {
      isVisible: true,
      hiddenReason: null,
      hiddenAt: null
    };
  }

  const nowIso = now instanceof Date && !Number.isNaN(now.getTime()) ? now.toISOString() : new Date().toISOString();
  return {
    isVisible: false,
    hiddenReason: 'subscription_expired',
    hiddenAt: nowIso
  };
};

const sanitizeTags = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const generateLedgerId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getServerTimestampValue = () => {
  const admin = getFirebaseAdmin();
  if (admin?.firestore?.FieldValue?.serverTimestamp) {
    return admin.firestore.FieldValue.serverTimestamp();
  }
  return new Date();
};

const assertEventValues = (values) => {
  if (!values || typeof values !== 'object') {
    throw new InvalidEventInputError();
  }
  const title = values.title?.trim();
  const location = values.location?.trim();
  const hostName = values.hostName?.trim();
  if (!title || !location || !hostName) {
    throw new InvalidEventInputError('Event title, location, and host name are required.');
  }
  if (!values.startDate) {
    throw new InvalidEventInputError('A start date is required to publish an event.');
  }
};

export const publishEventWithCredit = async (
  { userId, values, groupId, now = new Date() },
  { firestore: firestoreOverride } = {}
) => {
  const firestore = ensureFirestore(firestoreOverride);
  const normalizedUserId = normalizeId(userId);
  const normalizedGroupId = normalizeId(groupId ?? values?.groupId);

  if (!normalizedUserId) {
    throw new InvalidEventInputError('A valid userId is required.');
  }

  if (!normalizedGroupId) {
    throw new MissingGroupAssociationError();
  }

  assertEventValues(values);

  const eventValues = values ?? {};

  return firestore.runTransaction(async (transaction) => {
    const userRef = firestore.collection('users').doc(normalizedUserId);
    const groupRef = firestore.collection('groups').doc(normalizedGroupId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new InvalidEventInputError('User profile not found.');
    }

    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists) {
      throw new MissingGroupAssociationError('Group not found.');
    }

    const userData = userSnap.data() ?? {};
    const groupData = groupSnap.data() ?? {};

    if (!userCanManageGroup(groupData, normalizedUserId)) {
      throw new UnauthorizedEventCreatorError();
    }

    if (!isGroupSubscriptionActive(groupData)) {
      throw new SubscriptionInactiveError();
    }

    const credits = userData?.billing?.credits ?? {};
    const currentBalance = Number.isFinite(credits.balance) ? credits.balance : 0;
    if (currentBalance < 1) {
      throw new InsufficientCreditsError();
    }

    const startDate = parseDateInput(eventValues.startDate);
    if (!startDate) {
      throw new InvalidEventInputError('A valid start date is required to publish an event.');
    }
    const endDate = parseDateInput(eventValues.endDate);

    const fee = normalizeEventFee({
      amount: eventValues.feeAmount,
      currency: eventValues.feeCurrency,
      description: eventValues.feeDescription,
      disclosure: eventValues.feeDisclosure
    });

    const visibility = deriveInitialVisibility(groupData, now);

    const eventRef = firestore.collection('events').doc();
    transaction.set(eventRef, {
      title: eventValues.title.trim(),
      description: eventValues.description?.trim() ?? '',
      location: eventValues.location.trim(),
      startDate,
      endDate,
      hostName: eventValues.hostName.trim(),
      capacity: Number.isFinite(Number(eventValues.capacity))
        ? Math.max(0, Number(eventValues.capacity))
        : 0,
      tags: sanitizeTags(eventValues.tags),
      attendees: [],
      bannerImage: eventValues.bannerImage?.trim() || null,
      groupId: normalizedGroupId,
      groupTitle: typeof groupData.title === 'string' ? groupData.title : eventValues.groupTitle?.trim() || '',
      createdAt: getServerTimestampValue(),
      createdById: normalizedUserId,
      feeAmountCents: fee.amountCents,
      feeCurrency: fee.currency,
      feeDescription: fee.description,
      feeDisclosure: fee.disclosure,
      isVisible: visibility.isVisible,
      hiddenReason: visibility.hiddenReason,
      hiddenAt: visibility.hiddenAt
    });

    const nextBalance = currentBalance - 1;
    const ledgerHistory = Array.isArray(credits.history) ? credits.history.slice() : [];
    const nowIso = now.toISOString();
    const ledgerEntry = {
      id: generateLedgerId(),
      type: 'debit',
      amount: 1,
      balanceAfter: nextBalance,
      description: 'Published event',
      occurredAt: nowIso
    };
    ledgerHistory.push(ledgerEntry);

    transaction.update(userRef, {
      'billing.credits.balance': nextBalance,
      'billing.credits.history': ledgerHistory,
      'billing.credits.lastUpdatedAt': nowIso
    });

    return {
      event: {
        id: eventRef.id,
        isVisible: visibility.isVisible,
        hiddenReason: visibility.hiddenReason ?? null
      },
      credits: {
        balance: nextBalance,
        consumed: 1,
        autoPurchaseTriggered: false,
        autoPurchaseBundleId: null,
        autoPurchaseCredits: null,
        reminderTriggered: false,
        reminderSentAt: null
      }
    };
  });
};
