import type {
  BillingPlan,
  BillingPlansResponse,
  CheckoutSessionResponse,
  PortalSessionResponse
} from '../types/billing';

const BASE_URL = '/api/billing';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Unexpected billing service error');
  }

  return (await response.json()) as T;
};

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
