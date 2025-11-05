import { addMonths, differenceInHours } from 'date-fns';
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type {
  CreditBundle,
  CreditLedger,
  CreditReplenishmentMode,
  CreditReplenishmentSettings
} from '../types/billing';
import {
  createDefaultCreditLedger,
  createDefaultCreditUsage
} from '../types/billing';
import type { UserDTO } from '../types/user';
import { DEFAULT_BILLING_PROFILE } from '../types/user';

const USERS_COLLECTION = 'users';

export const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: 'bundle_starter',
    name: 'Starter pack',
    credits: 5,
    priceCents: 1500,
    currency: 'usd',
    highlight: 'Perfect for new organizers'
  },
  {
    id: 'bundle_team',
    name: 'Team bundle',
    credits: 20,
    priceCents: 4800,
    currency: 'usd',
    highlight: 'Best value for growing crews'
  },
  {
    id: 'bundle_scaler',
    name: 'Scale-up bundle',
    credits: 50,
    priceCents: 10500,
    currency: 'usd',
    highlight: 'For high-volume publishers'
  }
];

const CREDIT_COST_PER_EVENT = 1;

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits to publish event.');
    this.name = 'InsufficientCreditsError';
  }
}

const getBundleById = (bundleId: string): CreditBundle | undefined => {
  return CREDIT_BUNDLES.find((bundle) => bundle.id === bundleId);
};

export const listCreditBundles = () => [...CREDIT_BUNDLES];

export const createCreditCheckoutSession = async (userId: string, bundleId: string) => {
  const bundle = getBundleById(bundleId);
  if (!bundle) {
    throw new Error('Unable to locate the requested bundle.');
  }

  // In a real implementation this would call a backend endpoint to create the session
  // via Stripe's API. For this demo experience we return a mocked hosted URL so the UI
  // can open a new tab and the flow feels tangible to the user.
  const checkoutUrl = `https://billing.stripe.com/p/session/test_${userId}_${bundleId}`;

  return {
    checkoutUrl,
    bundle
  };
};

const shouldSendLowBalanceReminder = (ledger: CreditLedger, now: Date) => {
  if (!ledger.lowBalanceEmailSentAt) return true;
  const lastSent = new Date(ledger.lowBalanceEmailSentAt);
  if (Number.isNaN(lastSent.getTime())) return true;
  return differenceInHours(now, lastSent) >= 24;
};

const ensureLedger = (ledger?: CreditLedger) => {
  if (ledger) {
    return ledger;
  }
  return createDefaultCreditLedger();
};

const ensureBilling = (data: UserDTO | undefined) => {
  if (!data?.billing) {
    return DEFAULT_BILLING_PROFILE;
  }
  return data.billing;
};

export const consumeCreditsForEventPublish = async (
  userId: string,
  amount: number = CREDIT_COST_PER_EVENT
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const now = new Date();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('User profile not found.');
    }

    const data = snapshot.data() as UserDTO;
    const billing = ensureBilling(data);
    const ledger = ensureLedger(billing.credits);

    if (ledger.balance < amount) {
      throw new InsufficientCreditsError();
    }

    let updatedLedger: CreditLedger = {
      ...ledger,
      balance: ledger.balance - amount,
      lastUpdated: now.toISOString(),
      lowBalanceThreshold: ledger.lowBalanceThreshold ?? ledger.replenishment.threshold
    };

    const usage = billing.usage ?? createDefaultCreditUsage();
    let monthlyUsage = { ...usage };
    let cycleRenewal = new Date(monthlyUsage.cycleRenewsOn);

    if (Number.isNaN(cycleRenewal.getTime()) || cycleRenewal <= now) {
      cycleRenewal = addMonths(now, 1);
      monthlyUsage = {
        ...monthlyUsage,
        monthlyUsed: 0,
        cycleRenewsOn: cycleRenewal.toISOString()
      };
    }

    let autoPurchaseTriggered = false;
    let reminderTriggered = false;

    const { replenishment } = updatedLedger;
    const bundleForReplenishment = getBundleById(replenishment.bundleId) ?? CREDIT_BUNDLES[0];

    if (updatedLedger.balance <= replenishment.threshold) {
      if (replenishment.mode === 'auto') {
        updatedLedger = {
          ...updatedLedger,
          balance: updatedLedger.balance + bundleForReplenishment.credits,
          lastAutoPurchaseAt: now.toISOString(),
          lowBalanceEmailSentAt: null
        };
        autoPurchaseTriggered = true;
      } else if (replenishment.mode === 'reminder' && shouldSendLowBalanceReminder(updatedLedger, now)) {
        updatedLedger = {
          ...updatedLedger,
          lowBalanceEmailSentAt: now.toISOString()
        };
        reminderTriggered = true;
      }
    }

    monthlyUsage = {
      ...monthlyUsage,
      monthlyUsed: monthlyUsage.monthlyUsed + amount
    };

    transaction.set(
      userRef,
      {
        billing: {
          ...billing,
          credits: updatedLedger,
          usage: monthlyUsage
        },
        updatedAt: now.toISOString()
      },
      { merge: true }
    );

    return {
      balance: updatedLedger.balance,
      autoPurchaseTriggered,
      reminderTriggered
    };
  });
};

export const updateCreditReplenishmentMode = async (
  userId: string,
  mode: CreditReplenishmentMode
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  await updateDoc(userRef, {
    'billing.credits.replenishment.mode': mode,
    updatedAt: nowIso
  });
};

export const updateCreditReplenishmentSettings = async (
  userId: string,
  settings: CreditReplenishmentSettings
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();

  await updateDoc(userRef, {
    'billing.credits.replenishment': settings,
    'billing.credits.lowBalanceThreshold': settings.threshold,
    updatedAt: nowIso
  });
};
