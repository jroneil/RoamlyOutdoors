import { getStripeClient } from '../lib/stripe.js';
import { recordInvoiceStatus, updateStatusByCustomerId, upsertSubscription } from '../services/billingStore.js';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const parseEvent = (payload, signature) => {
  const stripe = getStripeClient();

  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET for webhook verification');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

const extractUserMetadata = (object) => {
  const metadata = object.metadata ?? {};
  const planId = metadata.planId ?? null;
  const userId = metadata.userId ?? metadata.userid ?? metadata.firebaseUid ?? null;

  return { planId, userId };
};

const handler = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).send('Missing Stripe signature');
  }

  let event;

  try {
    event = parseEvent(req.body, signature);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    return res.status(400).send('Webhook Error: signature verification failed');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = session.subscription;
      const customerId = session.customer;
      const { planId, userId } = extractUserMetadata(session);

      await upsertSubscription({
        userId,
        customerId,
        subscriptionId,
        status: 'active',
        currentPeriodEnd: null,
        metadata: {
          planId
        }
      });
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const { planId, userId } = extractUserMetadata(subscription);
      const priceId = subscription.items?.data?.[0]?.price?.id;

      await upsertSubscription({
        userId,
        customerId: subscription.customer,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        priceId,
        metadata: {
          planId
        }
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await updateStatusByCustomerId(subscription.customer, 'canceled', {
        subscriptionId: subscription.id,
        metadata: extractUserMetadata(subscription)
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await recordInvoiceStatus({
        customerId: invoice.customer,
        invoice,
        statusOverride: 'past_due'
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await recordInvoiceStatus({
        customerId: invoice.customer,
        invoice,
        statusOverride: 'active'
      });
      break;
    }
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  res.json({ received: true });
};

export default handler;
