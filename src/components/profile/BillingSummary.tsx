import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { BillingProfile } from '../../types/user';
import type { CreditBundle } from '../../types/billing';
import {
  createCreditCheckoutSession,
  listCreditBundles,
  updateCreditReplenishmentSettings
} from '../../services/billing';

interface BillingSummaryProps {
  billing: BillingProfile;
  userId: string;
  contactEmail: string;
  onManageSubscription?: () => void;
  isPortalLoading?: boolean;
  portalError?: string | null;
}

interface BundleOptionProps {
  bundle: CreditBundle;
  isSelected: boolean;
  onSelect: (bundleId: string) => void;
}

const formatCurrency = (amountCents: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  }).format(amountCents / 100);

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const BundleOption = ({ bundle, isSelected, onSelect }: BundleOptionProps) => (
  <label className={`bundle-option${isSelected ? ' bundle-option--selected' : ''}`}>
    <input
      type="radio"
      name="credit-bundle"
      value={bundle.id}
      checked={isSelected}
      onChange={() => onSelect(bundle.id)}
    />
    <div className="bundle-option__content">
      <div className="bundle-option__header">
        <span className="bundle-option__name">{bundle.name}</span>
        {bundle.isRecommended ? <span className="badge">Recommended</span> : null}
      </div>
      <p className="bundle-option__description">{bundle.description}</p>
      <div className="bundle-option__meta">
        <span className="bundle-option__credits">{bundle.credits} credits</span>
        <span className="bundle-option__price">{formatCurrency(bundle.priceCents, bundle.currency)}</span>
      </div>
    </div>
  </label>
);

const BillingSummary = ({
  billing,
  userId,
  contactEmail,
  onManageSubscription,
  isPortalLoading,
  portalError
}: BillingSummaryProps) => {
  const {
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    packageName,
    renewalDate,
    managedBy,
    entitlements,
    planId,
    lastInvoiceStatus,
    lastInvoiceUrl,
    lastPaymentError,
    credits,
    usage
  } = billing;

  const [bundles, setBundles] = useState<CreditBundle[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [replenishmentForm, setReplenishmentForm] = useState(() => ({
    mode: credits.replenishment.mode,
    threshold: String(credits.replenishment.threshold),
    bundleId: credits.replenishment.bundleId
  }));
  const [optimisticSettings, setOptimisticSettings] = useState(credits.replenishment);
  const [isReplenishmentSaving, setIsReplenishmentSaving] = useState(false);
  const [replenishmentError, setReplenishmentError] = useState<string | null>(null);
  const [replenishmentSuccess, setReplenishmentSuccess] = useState<string | null>(null);

  useEffect(() => {
    const availableBundles = listCreditBundles();
    setBundles(availableBundles);
    const recommended = availableBundles.find((bundle) => bundle.isRecommended);
    setSelectedBundleId((prev) => prev ?? recommended?.id ?? availableBundles[0]?.id ?? null);
  }, []);

  useEffect(() => {
    setReplenishmentForm({
      mode: credits.replenishment.mode,
      threshold: String(credits.replenishment.threshold),
      bundleId: credits.replenishment.bundleId
    });
    setOptimisticSettings(credits.replenishment);
  }, [credits.replenishment]);

  const usageSummary = useMemo(() => {
    const limit = usage.monthlyLimit;
    const used = usage.monthlyUsed;
    const percent = limit > 0 ? Math.round(Math.min(100, (used / limit) * 100)) : 0;
    return {
      monthlyLimit: limit,
      monthlyUsed: used,
      cycleRenewsOn: usage.cycleRenewsOn,
      percent
    };
  }, [usage.cycleRenewsOn, usage.monthlyLimit, usage.monthlyUsed]);

  const modeDescription = useMemo(() => {
    if (optimisticSettings.mode === 'auto') {
      const autoBundle = bundles.find((bundle) => bundle.id === optimisticSettings.bundleId);
      const bundleLabel = autoBundle ? `${autoBundle.credits}-credit bundle` : 'selected bundle';
      return `Automatically purchase the ${bundleLabel} when your balance reaches ${optimisticSettings.threshold} credits.`;
    }

    return `Send a reminder email when your balance reaches ${optimisticSettings.threshold} credits.`;
  }, [bundles, optimisticSettings]);

  const lastActionCopy = useMemo(() => {
    const history = credits.history.slice().sort((a, b) => {
      const aTime = new Date(a.occurredAt).getTime();
      const bTime = new Date(b.occurredAt).getTime();
      return bTime - aTime;
    });

    if (history.length > 0) {
      const latest = history[0];
      const verb =
        latest.type === 'credit' ? 'Added' : latest.type === 'debit' ? 'Used' : 'Adjusted by';
      const detail = latest.description ? ` — ${latest.description}` : '';
      return `${verb} ${Math.abs(latest.amount)} credits on ${formatDate(latest.occurredAt)}${detail}.`;
    }

    if (credits.lastAutoPurchaseAt) {
      return `Auto-purchase triggered ${formatDate(credits.lastAutoPurchaseAt)}.`;
    }

    if (credits.lowBalanceEmailSentAt) {
      return `Low balance reminder sent ${formatDate(credits.lowBalanceEmailSentAt)}.`;
    }

    return 'No credit activity recorded yet.';
  }, [credits.history, credits.lastAutoPurchaseAt, credits.lowBalanceEmailSentAt]);

  const handleSelectBundle = (bundleId: string) => {
    setSelectedBundleId(bundleId);
    setCheckoutError(null);
  };

  const handlePurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBundleId) {
      setCheckoutError('Please select a bundle to purchase.');
      return;
    }

    try {
      setIsCheckoutLoading(true);
      setCheckoutError(null);
      const successUrl = `${window.location.origin}/billing?billing=updated`;
      const cancelUrl = `${window.location.origin}/billing`;
      const url = await createCreditCheckoutSession({
        bundleId: selectedBundleId,
        userId,
        successUrl,
        cancelUrl
      });
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setCheckoutError('Unable to start checkout. Please try again or contact support.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleReplenishmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReplenishmentError(null);
    setReplenishmentSuccess(null);

    const parsedThreshold = Number.parseInt(replenishmentForm.threshold, 10);
    const nextSettings = {
      mode: replenishmentForm.mode,
      threshold: Number.isNaN(parsedThreshold) ? 0 : Math.max(parsedThreshold, 0),
      bundleId: replenishmentForm.bundleId
    };

    const previousSettings = optimisticSettings;
    setOptimisticSettings(nextSettings);
    setIsReplenishmentSaving(true);

    try {
      const updated = await updateCreditReplenishmentSettings(userId, nextSettings);
      setReplenishmentForm({
        mode: updated.mode,
        threshold: String(updated.threshold),
        bundleId: updated.bundleId
      });
      setOptimisticSettings(updated);
      setReplenishmentSuccess('Replenishment settings saved.');
    } catch (err) {
      console.error(err);
      setOptimisticSettings(previousSettings);
      setReplenishmentError(
        err instanceof Error ? err.message : 'Unable to update replenishment settings.'
      );
    } finally {
      setIsReplenishmentSaving(false);
    }
  };

  return (
    <section className="card profile-card">
      <header className="profile-card__header">
        <h2>Subscription &amp; Credits</h2>
        <span className={`status-badge status-${subscriptionStatus}`}>{subscriptionStatus}</span>
      </header>
      <p className="profile-card__description">{modeDescription}</p>

      <dl className="profile-card__details credit-summary">
        <div>
          <dt>Current package</dt>
          <dd>{packageName ?? 'Not assigned'}</dd>
        </div>
        <div>
          <dt>Plan ID</dt>
          <dd>{planId ?? 'Not assigned'}</dd>
        </div>
        <div>
          <dt>Next renewal</dt>
          <dd>{renewalDate ? new Date(renewalDate).toLocaleDateString() : 'Not scheduled'}</dd>
        </div>
        <div>
          <dt>Stripe customer ID</dt>
          <dd>{stripeCustomerId ?? 'Pending'}</dd>
        </div>
        <div>
          <dt>Stripe subscription ID</dt>
          <dd>{stripeSubscriptionId ?? 'Pending'}</dd>
        </div>
        <div>
          <dt>Managed by</dt>
          <dd>{managedBy === 'manual' ? 'Manual billing' : 'Stripe portal'}</dd>
        </div>
        <div>
          <dt>Credits remaining</dt>
          <dd>{credits.balance} credits</dd>
        </div>
        <div>
          <dt>Usage this cycle</dt>
          <dd>
            {usageSummary.monthlyUsed} / {usageSummary.monthlyLimit} credits
          </dd>
        </div>
        <div>
          <dt>Cycle renews</dt>
          <dd>{formatDate(usageSummary.cycleRenewsOn)}</dd>
        </div>
        <div>
          <dt>Alerts</dt>
          <dd>{lastActionCopy}</dd>
        </div>
        <div>
          <dt>Last invoice</dt>
          <dd>
            {lastInvoiceStatus ? (
              <>
                <span className={`status-badge status-${lastInvoiceStatus}`}>{lastInvoiceStatus}</span>
                {lastInvoiceUrl ? (
                  <>
                    {' '}
                    <a href={lastInvoiceUrl} target="_blank" rel="noreferrer">
                      View invoice
                    </a>
                  </>
                ) : null}
              </>
            ) : (
              'No invoices yet'
            )}
          </dd>
        </div>
        {lastPaymentError ? (
          <div>
            <dt>Last payment error</dt>
            <dd className="error-text">{lastPaymentError}</dd>
          </div>
        ) : null}
      </dl>
      {entitlements ? (
        <div className="profile-card__entitlements">
          <h3>Entitlements</h3>
          <ul>
            <li>
              <strong>{entitlements.groupQuota || 0}</strong> groups included in your plan
            </li>
            <li>
              <strong>{entitlements.maxEventsPerMonth}</strong> hosted events per month
            </li>
            <li>
              <strong>{entitlements.teamSeats}</strong> team seats available
            </li>
            <li>Support level: {entitlements.supportLevel}</li>
          </ul>
        </div>
      ) : null}
      {onManageSubscription ? (
        <div className="profile-card__actions">
          <button
            type="button"
            className="primary"
            onClick={() => onManageSubscription()}
            disabled={isPortalLoading}
          >
            {isPortalLoading ? 'Loading portal…' : 'Manage subscription'}
          </button>
          {portalError ? <p className="error-text">{portalError}</p> : null}
        </div>
      ) : null}

      <hr className="profile-card__divider" />

      <div className="credit-actions">
        <section className="credit-actions__section">
          <h3>Purchase credits</h3>
          <p>One-time purchases are billed via Stripe. Receipts go to {contactEmail}.</p>
          <form onSubmit={handlePurchase} className="credit-actions__form">
            <div className="bundle-grid">
              {bundles.map((bundle) => (
                <BundleOption
                  key={bundle.id}
                  bundle={bundle}
                  isSelected={bundle.id === selectedBundleId}
                  onSelect={handleSelectBundle}
                />
              ))}
            </div>
            <button type="submit" className="primary" disabled={isCheckoutLoading}>
              {isCheckoutLoading ? 'Starting checkout…' : 'Purchase credits'}
            </button>
            {checkoutError ? <p className="error-text">{checkoutError}</p> : null}
          </form>
        </section>

        <section className="credit-actions__section">
          <h3>Auto-replenishment</h3>
          <p>Set a safety net so your publishing credits never run out mid-campaign.</p>
          <form onSubmit={handleReplenishmentSubmit} className="credit-actions__form">
            <div className="field-group">
              <label>
                <input
                  type="radio"
                  name="replenishment-mode"
                  value="auto"
                  checked={replenishmentForm.mode === 'auto'}
                  onChange={() =>
                    setReplenishmentForm((current) => ({
                      ...current,
                      mode: 'auto'
                    }))
                  }
                />{' '}
                Auto purchase
              </label>
              <label>
                <input
                  type="radio"
                  name="replenishment-mode"
                  value="manual"
                  checked={replenishmentForm.mode === 'manual'}
                  onChange={() =>
                    setReplenishmentForm((current) => ({
                      ...current,
                      mode: 'manual'
                    }))
                  }
                />{' '}
                Send reminder
              </label>
            </div>

            <label className="field">
              <span>Trigger threshold</span>
              <input
                type="number"
                min={0}
                value={replenishmentForm.threshold}
                onChange={(event) =>
                  setReplenishmentForm((current) => ({
                    ...current,
                    threshold: event.target.value
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Bundle to purchase</span>
              <select
                value={replenishmentForm.bundleId}
                onChange={(event) =>
                  setReplenishmentForm((current) => ({
                    ...current,
                    bundleId: event.target.value
                  }))
                }
                disabled={replenishmentForm.mode !== 'auto'}
              >
                <option value="" disabled>
                  Select a bundle
                </option>
                {bundles.map((bundle) => (
                  <option key={bundle.id} value={bundle.id}>
                    {bundle.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="secondary" disabled={isReplenishmentSaving}>
              {isReplenishmentSaving ? 'Saving…' : 'Save preferences'}
            </button>
            {replenishmentError ? <p className="error-text">{replenishmentError}</p> : null}
            {replenishmentSuccess ? <p className="success-text">{replenishmentSuccess}</p> : null}
          </form>
        </section>
      </div>
    </section>
  );
};

export default BillingSummary;
