import { getFirestore } from '../firebaseAdmin.js';
import {
  SUBSCRIPTION_HIDDEN_REASON,
  computeGroupSubscriptionUpdate,
  deriveEventVisibilityChanges,
  isSubscriptionInactive,
  mapExpiryIsoToDate
} from './subscriptionArtifacts.js';

const BATCH_LIMIT = 450;

const commitInChunks = async (db, updates) => {
  for (let index = 0; index < updates.length; index += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = updates.slice(index, index + BATCH_LIMIT);
    chunk.forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true });
    });
    await batch.commit();
  }
};

export const syncSubscriptionArtifacts = async ({ userId, status, renewalDate, now = new Date() }) => {
  const db = getFirestore();
  if (!db || !userId) {
    return false;
  }

  const groupsSnapshot = await db.collection('groups').where('ownerId', '==', userId).get();

  if (groupsSnapshot.empty) {
    return true;
  }

  const groupUpdates = [];
  const groupMeta = [];

  groupsSnapshot.forEach((doc) => {
    const data = doc.data() ?? {};
    const update = computeGroupSubscriptionUpdate({
      currentStatus: data.subscriptionStatus ?? 'none',
      nextStatus: status,
      currentExpiredAt: data.subscriptionExpiredAt,
      now
    });

    if (typeof renewalDate !== 'undefined') {
      update.subscriptionRenewalDate = renewalDate;
    }

    groupUpdates.push({
      ref: doc.ref,
      data: update
    });

    const targetExpiry = update.subscriptionExpiredAt ?? data.subscriptionExpiredAt ?? null;
    groupMeta.push({
      id: doc.id,
      expiredAt: mapExpiryIsoToDate(targetExpiry)
    });
  });

  await commitInChunks(db, groupUpdates);

  const inactive = isSubscriptionInactive(status);
  const nowIso = now.toISOString();

  for (const { id: groupId, expiredAt } of groupMeta) {
    const eventsSnapshot = await db.collection('events').where('groupId', '==', groupId).get();
    if (eventsSnapshot.empty) {
      continue;
    }

    const eventDocs = eventsSnapshot.docs;
    const events = eventDocs.map((doc) => {
      const eventData = doc.data() ?? {};
      return {
        id: doc.id,
        createdAt: eventData.createdAt ?? null,
        isVisible: eventData.isVisible,
        hiddenReason: eventData.hiddenReason ?? null
      };
    });

    const { toHide, toRestore } = deriveEventVisibilityChanges({
      events,
      expiredAt,
      isInactive: inactive,
      now
    });

    if (toHide.length === 0 && toRestore.length === 0) {
      continue;
    }

    const eventMap = new Map(eventDocs.map((doc) => [doc.id, doc.ref]));
    const batch = db.batch();

    toHide.forEach((eventId) => {
      const ref = eventMap.get(eventId);
      if (!ref) return;
      batch.update(ref, {
        isVisible: false,
        hiddenReason: SUBSCRIPTION_HIDDEN_REASON,
        hiddenAt: nowIso
      });
    });

    toRestore.forEach((eventId) => {
      const ref = eventMap.get(eventId);
      if (!ref) return;
      batch.update(ref, {
        isVisible: true,
        hiddenReason: null,
        hiddenAt: null
      });
    });

    await batch.commit();
  }

  return true;
};

export default {
  syncSubscriptionArtifacts
};
