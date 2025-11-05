import express from 'express';
import { getStripeClient } from '../lib/stripe.js';
import { findPlanById, serializePlansForClient } from '../config/stripeProducts.js';

const router = express.Router();

router.get('/plans', (req, res) => {
  res.json({ plans: serializePlansForClient() });
});

router.post('/checkout-session', async (req, res) => {
  const { planId, customerId, userId, email, successUrl, cancelUrl } = req.body ?? {};

  if (!planId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'planId, successUrl, and cancelUrl are required' });
  }

  const plan = findPlanById(planId);

  if (!plan) {
    return res.status(404).json({ error: 'Unknown plan requested' });
  }

  try {
    const stripe = getStripeClient();

    let stripeCustomerId = customerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: userId ? { userId } : undefined
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: userId ?? undefined,
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...(userId ? { userId } : {}),
        planId: plan.id
      },
      subscription_data: {
        metadata: {
          ...(userId ? { userId } : {}),
          planId: plan.id
        }
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create checkout session', error);
    res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

router.post('/portal-session', async (req, res) => {
  const { customerId, returnUrl } = req.body ?? {};

  if (!customerId || !returnUrl) {
    return res.status(400).json({ error: 'customerId and returnUrl are required' });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create portal session', error);
    res.status(500).json({ error: 'Unable to create billing portal session' });
  }
});

export default router;
