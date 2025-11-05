import { getFirestore } from '../firebaseAdmin.js';
import { isSubscriptionInactive } from '../services/subscriptionArtifacts.js';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const EXPIRATION_DAYS = 30;
const CLEANUP_INTERVAL = MILLISECONDS_IN_DAY;
const INACTIVE_STATUSES = ['canceled', 'past_due', 'none'];

const deleteGroupAndEvents = async (db, groupDoc) => {
  const eventsSnapshot = await db.collection('events').where('groupId', '==', groupDoc.id).get();
  const eventDocs = eventsSnapshot.docs;

  for (let index = 0; index < eventDocs.length; index += 450) {
    const batch = db.batch();
    const chunk = eventDocs.slice(index, index + 450);
    chunk.forEach((doc) => batch.delete(doc.ref));
    if (index + chunk.length >= eventDocs.length) {
      batch.delete(groupDoc.ref);
    }
    await batch.commit();
  }

  if (eventDocs.length === 0) {
    await groupDoc.ref.delete();
  }
};

export const deleteExpiredGroupsAndEvents = async (now = new Date()) => {
  const db = getFirestore();
  if (!db) {
    return false;
  }

  const cutoffIso = new Date(now.getTime() - EXPIRATION_DAYS * MILLISECONDS_IN_DAY).toISOString();

  for (const status of INACTIVE_STATUSES) {
    const snapshot = await db
      .collection('groups')
      .where('subscriptionStatus', '==', status)
      .where('subscriptionExpiredAt', '<=', cutoffIso)
      .get();

    if (snapshot.empty) {
      continue;
    }

    for (const groupDoc of snapshot.docs) {
      const expiredAt = groupDoc.get('subscriptionExpiredAt');
      if (!expiredAt) {
        continue;
      }

      if (!isSubscriptionInactive(status)) {
        continue;
      }

      await deleteGroupAndEvents(db, groupDoc);
    }
  }

  return true;
};

export const scheduleSubscriptionCleanup = (intervalMs = CLEANUP_INTERVAL) => {
  const runCleanup = () => {
    deleteExpiredGroupsAndEvents().catch((error) => {
      console.error('Subscription cleanup job failed', error);
    });
  };

  runCleanup();
  const handle = setInterval(runCleanup, intervalMs);
  return () => clearInterval(handle);
};

export default {
  deleteExpiredGroupsAndEvents,
  scheduleSubscriptionCleanup
};
