import Stripe from 'stripe';

let stripeClient;

export const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2023-10-16'
  });

  return stripeClient;
};
