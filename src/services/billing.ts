import type {
  BillingPlan,
  BillingPlansResponse,
  CheckoutSessionResponse,
  PortalSessionResponse,
  CreditBundle,
  CreditConsumptionRequest,
  CreditConsumptionResult,
  CreditReplenishmentSettings
} from '../types/billing';

const BASE_URL = '/api/billing';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Unexpected billing service error');
  }

  return (await response.json()) as T;
};

export class InsufficientCreditsError extends Error {
  constructor(message = 'Not enough credits to complete this action.') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: 'starter-10',
    name: 'Starter — 10 credits',
    description: 'Perfect for new organizers publishing a handful of events each month.',
    credits: 10,
    priceCents: 1500,
    currency: 'usd',
    isRecommended: false
  },
  {
    id: 'growth-25',
    name: 'Growth — 25 credits',
    description: 'Best for active communities hosting weekly adventures.',
    credits: 25,
    priceCents: 3000,
    currency: 'usd',
    isRecommended: true
  },
  {
    id: 'scale-60',
    name: 'Scale — 60 credits',
    description: 'High-volume teams that rely on auto-purchase safety nets.',
    credits: 60,
    priceCents: 6000,
    currency: 'usd',
    isRecommended: false
  }
];

interface CreditCheckoutPayload {
  bundleId: string;
  userId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
}

interface CreditReplenishmentPayload {
  userId: string;
  settings: CreditReplenishmentSettings;
}

interface CreditReplenishmentResponse {
  settings: CreditReplenishmentSettings;
}

export const fetchBillingPlans = async (): Promise<BillingPlan[]> => {
  const response = await fetch(`${BASE_URL}/plans`);
  const payload = await handleResponse<BillingPlansResponse>(response);
  return payload.plans;
};

interface CheckoutPayload {
  planId: string;
  customerId?: string;
  userId?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}

export const createCheckoutSession = async (payload: CheckoutPayload): Promise<string> => {
  const response = await fetch(`${BASE_URL}/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await handleResponse<CheckoutSessionResponse>(response);
  return data.url;
};

interface PortalPayload {
  customerId: string;
  returnUrl: string;
}

export const createBillingPortalSession = async (payload: PortalPayload): Promise<string> => {
  const response = await fetch(`${BASE_URL}/portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await handleResponse<PortalSessionResponse>(response);
  return data.url;
};

export const createCreditCheckoutSession = async (
  payload: CreditCheckoutPayload
): Promise<string> => {
  const response = await fetch(`${BASE_URL}/credits/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await handleResponse<CheckoutSessionResponse>(response);
  return data.url;
};

export const updateCreditReplenishmentSettings = async (
  userId: string,
  settings: CreditReplenishmentSettings
): Promise<CreditReplenishmentSettings> => {
  const response = await fetch(`${BASE_URL}/credits/replenishment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, settings } satisfies CreditReplenishmentPayload)
  });

  const data = await handleResponse<CreditReplenishmentResponse>(response);
  return data.settings;
};

export const listCreditBundles = (): CreditBundle[] =>
  CREDIT_BUNDLES.map((bundle) => ({ ...bundle }));

export const consumeCreditsForEventPublish = async (
  userId: string
): Promise<CreditConsumptionResult> => {
  const payload: CreditConsumptionRequest = {
    userId,
    amount: 1,
    reason: 'event_publish'
  };

  const response = await fetch(`${BASE_URL}/credits/consume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json().catch(() => ({}))) as Partial<CreditConsumptionResult> & {
    error?: string;
  };

  if (!response.ok) {
    if (response.status === 402 || response.status === 409) {
      throw new InsufficientCreditsError(
        body.error ?? 'You do not have enough credits to publish this event.'
      );
    }

    throw new Error(body.error ?? 'Unexpected billing service error');
  }

  const normalized: CreditConsumptionResult = {
    balance: body.balance ?? 0,
    consumed: body.consumed ?? payload.amount,
    autoPurchaseTriggered: Boolean(body.autoPurchaseTriggered),
    autoPurchaseBundleId: body.autoPurchaseBundleId ?? null,
    autoPurchaseCredits: body.autoPurchaseCredits ?? null,
    reminderTriggered: Boolean(body.reminderTriggered),
    reminderSentAt: body.reminderSentAt ?? null
  };

  return normalized;
};
