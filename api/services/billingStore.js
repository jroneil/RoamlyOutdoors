import { getFirestore } from '../firebaseAdmin.js';
import { findPlanById, findPlanByPriceId } from '../config/stripeProducts.js';

const db = getFirestore();

const getUserDocById = async (userId) => {
  if (!db) {
    return null;
  }

  const ref = db.collection('users').doc(userId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot;
};

const getUserDocByCustomer = async (customerId) => {
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection('users')
    .where('billing.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
};

const buildBillingPayload = ({
  customerId,
  subscriptionId,
  status,
  renewalDate,
  plan,
  metadata,
  invoice
}) => {
  const payload = {
    billing: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: status,
      renewalDate: renewalDate ?? null,
      packageName: plan?.name ?? metadata?.packageName ?? null,
      planId: plan?.id ?? metadata?.planId ?? null,
      entitlements: plan?.entitlements ?? metadata?.entitlements ?? null,
      managedBy: 'stripe'
    },
    updatedAt: new Date().toISOString()
  };

  if (invoice) {
    payload.billing.lastInvoiceStatus = invoice.status ?? null;
    payload.billing.lastInvoiceUrl = invoice.hosted_invoice_url ?? null;
    payload.billing.lastPaymentError = invoice.last_finalization_error?.message ?? null;
  }

  return payload;
};

export const upsertSubscription = async ({
  userId,
  customerId,
  subscriptionId,
  status,
  currentPeriodEnd,
  priceId,
  metadata = {}
}) => {
  if (!db) {
    return false;
  }

  const plan = priceId ? findPlanByPriceId(priceId) : metadata.planId ? findPlanById(metadata.planId) : null;
  const renewalDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
  const payload = buildBillingPayload({
    customerId,
    subscriptionId,
    status,
    renewalDate,
    plan,
    metadata
  });

  const snapshot = userId ? await getUserDocById(userId) : await getUserDocByCustomer(customerId);

  if (!snapshot) {
    console.warn('Unable to locate user document for Stripe customer', customerId);
    return false;
  }

  await snapshot.ref.set(payload, { merge: true });
  return true;
};

export const updateStatusByCustomerId = async (customerId, status, extra = {}) => {
  if (!db) {
    return false;
  }

  const snapshot = await getUserDocByCustomer(customerId);

  if (!snapshot) {
    console.warn('Unable to locate user for status update', customerId);
    return false;
  }

  const payload = buildBillingPayload({
    customerId,
    subscriptionId: extra.subscriptionId ?? snapshot.get('billing.stripeSubscriptionId') ?? null,
    status,
    renewalDate: extra.renewalDate ?? snapshot.get('billing.renewalDate') ?? null,
    plan: extra.planId ? findPlanById(extra.planId) : null,
    metadata: extra.metadata,
    invoice: extra.invoice
  });

  await snapshot.ref.set(payload, { merge: true });
  return true;
};

export const recordInvoiceStatus = async ({ customerId, invoice, statusOverride }) => {
  if (!db) {
    return false;
  }

  const snapshot = await getUserDocByCustomer(customerId);

  if (!snapshot) {
    console.warn('Unable to locate user for invoice sync', customerId);
    return false;
  }

  const defaultPrice =
    typeof invoice.default_price === 'string' ? invoice.default_price : invoice.default_price?.id;

  const payload = buildBillingPayload({
    customerId,
    subscriptionId: invoice.subscription ?? snapshot.get('billing.stripeSubscriptionId') ?? null,
    status: statusOverride ?? snapshot.get('billing.subscriptionStatus') ?? 'active',
    renewalDate: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : snapshot.get('billing.renewalDate') ?? null,
    plan: defaultPrice ? findPlanByPriceId(defaultPrice) : null,
    invoice
  });

  await snapshot.ref.set(payload, { merge: true });
  return true;
};
