const loadEnv = (key, fallback) => {
  if (process.env[key] && process.env[key]?.trim()) {
    return process.env[key];
  }

  return fallback;
};

export const BILLING_CURRENCY = 'usd';

export const BILLING_PLANS = [
  {
    id: 'trailhead',
    name: 'Trailhead',
    description: 'Start organizing hikes and paddles with core collaboration tools.',
    productId: loadEnv('STRIPE_PRODUCT_TRAILHEAD', 'prod_TRAILHEAD_SAMPLE'),
    priceId: loadEnv('STRIPE_PRICE_TRAILHEAD_MONTHLY', 'price_TRAILHEAD_SAMPLE'),
    unitAmount: 1900,
    interval: 'month',
    entitlements: {
      maxEventsPerMonth: 10,
      teamSeats: 3,
      supportLevel: 'community'
    }
  },
  {
    id: 'basecamp',
    name: 'Basecamp',
    description: 'Upgrade to expanded analytics, automations, and live support.',
    productId: loadEnv('STRIPE_PRODUCT_BASECAMP', 'prod_BASECAMP_SAMPLE'),
    priceId: loadEnv('STRIPE_PRICE_BASECAMP_MONTHLY', 'price_BASECAMP_SAMPLE'),
    unitAmount: 4900,
    interval: 'month',
    entitlements: {
      maxEventsPerMonth: 40,
      teamSeats: 10,
      supportLevel: 'priority'
    }
  },
  {
    id: 'summit',
    name: 'Summit',
    description: 'Enterprise controls with concierge onboarding and premier support.',
    productId: loadEnv('STRIPE_PRODUCT_SUMMIT', 'prod_SUMMIT_SAMPLE'),
    priceId: loadEnv('STRIPE_PRICE_SUMMIT_MONTHLY', 'price_SUMMIT_SAMPLE'),
    unitAmount: 12900,
    interval: 'month',
    entitlements: {
      maxEventsPerMonth: 200,
      teamSeats: 30,
      supportLevel: 'concierge'
    }
  }
];

export const findPlanById = (planId) => BILLING_PLANS.find((plan) => plan.id === planId);

export const findPlanByPriceId = (priceId) =>
  BILLING_PLANS.find((plan) => plan.priceId === priceId);

export const serializePlansForClient = () =>
  BILLING_PLANS.map(({ id, name, description, unitAmount, interval, entitlements }) => ({
    id,
    name,
    description,
    unitAmount,
    interval,
    entitlements,
    currency: BILLING_CURRENCY
  }));
