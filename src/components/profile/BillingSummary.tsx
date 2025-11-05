import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { BillingProfile } from '../../types/user';
import type { CreditBundle, CreditReplenishmentSettings } from '../../types/billing';
import {
  createCreditCheckoutSession,
  listCreditBundles,
  updateCreditReplenishmentSettings
} from '../../services/billing';

interface BillingSummaryProps {
  billing: BillingProfile;
  userId: string;
  contactEmail: string;
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

const BundleOption = ({ bundle, isSelected, onSelect }: BundleOptionProps) => {
  return (
    <label className={`credit-bundle ${isSelected ? 'credit-bundle--active' : ''}`}>
      <input
        type="radio"
        name="credit-bundle"
        value={bundle.id}
        checked={isSelected}
        onChange={() => onSelect(bundle.id)}
      />
      <div className="credit-bundle__content">
        <div className="credit-bundle__header">
          <h4>{bundle.name}</h4>
          <span className="credit-bundle__price">{formatCurrency(bundle.priceCents, bundle.currency)}</span>
        </div>
        <p className="credit-bundle__meta">
          {bundle.credits} credits • {formatCurrency(Math.round(bundle.priceCents / bundle.credits), bundle.currency)} per credit
        </p>
        {bundle.highlight && <p className="credit-bundle__highlight">{bundle.highlight}</p>}
      </div>
    </label>
  );
};

const BillingSummary = ({ billing, userId, contactEmail }: BillingSummaryProps) => {
  const bundles = useMemo(() => listCreditBundles(), []);
  const [selectedBundleId, setSelectedBundleId] = useState<string>(bundles[0]?.id ?? '');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [replenishment, setReplenishment] = useState<CreditReplenishmentSettings>(
    billing.credits.replenishment
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    setReplenishment(billing.credits.replenishment);
    if (!selectedBundleId) {
      setSelectedBundleId(billing.credits.replenishment.bundleId || bundles[0]?.id || '');
    }
  }, [billing.credits.replenishment, bundles, selectedBundleId]);

  const activeBundle = useMemo(
    () => bundles.find((bundle) => bundle.id === selectedBundleId) ?? bundles[0],
    [bundles, selectedBundleId]
  );

  const autoBundle = useMemo(
    () => bundles.find((bundle) => bundle.id === replenishment.bundleId) ?? bundles[0],
    [bundles, replenishment.bundleId]
  );

  const isSettingsDirty = useMemo(() => {
    const current = billing.credits.replenishment;
    return (
      current.mode !== replenishment.mode ||
      current.threshold !== replenishment.threshold ||
      current.bundleId !== replenishment.bundleId
    );
  }, [billing.credits.replenishment, replenishment]);

  const handlePurchase = async () => {
    if (!activeBundle) return;
    setIsPurchasing(true);
    setPurchaseMessage(null);
    setPurchaseError(null);
    try {
      const session = await createCreditCheckoutSession(userId, activeBundle.id);
      setPurchaseMessage(`Stripe checkout opened in a new tab for the ${activeBundle.name}.`);

      if (typeof window !== 'undefined') {
        window.open(session.checkoutUrl, '_blank', 'noopener');
      }
    } catch (error) {
      console.error(error);
      setPurchaseError('Unable to start checkout. Please try again in a moment.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSettingsDirty) return;
    setIsSavingSettings(true);
    setSettingsMessage(null);
    setSettingsError(null);

    try {
      await updateCreditReplenishmentSettings(userId, replenishment);
      setSettingsMessage('Credit replenishment preferences saved.');
    } catch (error) {
      console.error(error);
      setSettingsError('Unable to update replenishment settings right now. Please retry later.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const usage = billing.usage;
  const usageRatio = Math.min(1, usage.monthlyUsed / (usage.monthlyLimit || 1));
  const usagePercent = Math.round(usageRatio * 100);

  const modeDescription =
    replenishment.mode === 'auto'
      ? `We will automatically purchase the ${autoBundle?.name ?? 'selected'} bundle when your balance falls to ${replenishment.threshold} credits.`
      : `A low balance email is sent to ${contactEmail} when you have ${replenishment.threshold} credits left.`;

  const lastActionCopy =
    billing.credits.replenishment.mode === 'auto'
      ? `Last auto-purchase: ${formatDate(billing.credits.lastAutoPurchaseAt)}`
      : `Last reminder sent: ${formatDate(billing.credits.lowBalanceEmailSentAt)}`;

  return (
    <section className="card profile-card">
      <header className="profile-card__header">
        <h2>Subscription &amp; Credits</h2>
        <span className={`status-badge status-${billing.subscriptionStatus}`}>
          {billing.subscriptionStatus}
        </span>
      </header>
      <p className="profile-card__description">{modeDescription}</p>

      <dl className="profile-card__details credit-summary">
        <div>
          <dt>Current package</dt>
          <dd>{billing.packageName ?? 'Not assigned'}</dd>
        </div>
        <div>
          <dt>Next renewal</dt>
          <dd>{billing.renewalDate ? new Date(billing.renewalDate).toLocaleDateString() : 'Not scheduled'}</dd>
        </div>
        <div>
          <dt>Stripe customer ID</dt>
          <dd>{billing.stripeCustomerId ?? 'Pending'}</dd>
        </div>
        <div>
          <dt>Managed by</dt>
          <dd>{billing.managedBy === 'manual' ? 'Manual billing' : 'Stripe portal'}</dd>
        </div>
        <div>
          <dt>Credits remaining</dt>
          <dd>{billing.credits.balance} credits</dd>
        </div>
        <div>
          <dt>Usage this cycle</dt>
          <dd>
            {usage.monthlyUsed} / {usage.monthlyLimit} credits
          </dd>
        </div>
        <div>
          <dt>Cycle renews</dt>
          <dd>{formatDate(billing.usage.cycleRenewsOn)}</dd>
        </div>
        <div>
          <dt>Alerts</dt>
          <dd>{lastActionCopy}</dd>
        </div>
      </dl>

      <div className="credit-usage">
        <div className="credit-usage__bar">
          <div className="credit-usage__fill" style={{ width: `${usagePercent}%` }} />
        </div>
        <span className="credit-usage__label">{usagePercent}% of cycle credits consumed</span>
      </div>

      <form className="credit-settings" onSubmit={handleSettingsSubmit}>
        <h3>Credit replenishment</h3>
        <div className="credit-settings__options">
          <label>
            <input
              type="radio"
              name="replenishment-mode"
              value="auto"
              checked={replenishment.mode === 'auto'}
              onChange={() => setReplenishment((prev) => ({ ...prev, mode: 'auto' }))}
            />
            Auto-purchase credits
          </label>
          <label>
            <input
              type="radio"
              name="replenishment-mode"
              value="reminder"
              checked={replenishment.mode === 'reminder'}
              onChange={() => setReplenishment((prev) => ({ ...prev, mode: 'reminder' }))}
            />
            Send reminder emails
          </label>
        </div>

        <div className="credit-settings__grid">
          <label className="credit-settings__field">
            <span>Trigger threshold</span>
            <input
              type="number"
              min={1}
              value={replenishment.threshold}
              onChange={(event) =>
                setReplenishment((prev) => ({
                  ...prev,
                  threshold: Math.max(1, Number(event.target.value) || 1)
                }))
              }
            />
          </label>
          <label className="credit-settings__field">
            <span>Auto-purchase bundle</span>
            <select
              value={replenishment.bundleId}
              onChange={(event) =>
                setReplenishment((prev) => ({ ...prev, bundleId: event.target.value }))
              }
            >
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>
                  {bundle.name} ({bundle.credits} credits)
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="secondary" type="submit" disabled={!isSettingsDirty || isSavingSettings}>
          {isSavingSettings ? 'Saving...' : 'Save replenishment preferences'}
        </button>
        {settingsMessage && <p className="credit-settings__feedback success">{settingsMessage}</p>}
        {settingsError && <p className="credit-settings__feedback warning">{settingsError}</p>}
      </form>

      <div className="credit-purchase">
        <h3>Buy one-time credit bundles</h3>
        <p className="credit-purchase__description">
          Launch a Stripe-hosted checkout to top up your balance instantly. Credits apply as soon as the
          payment succeeds.
        </p>

        <div className="credit-bundle-list">
          {bundles.map((bundle) => (
            <BundleOption
              key={bundle.id}
              bundle={bundle}
              isSelected={selectedBundleId === bundle.id}
              onSelect={setSelectedBundleId}
            />
          ))}
        </div>

        <button className="primary" type="button" onClick={handlePurchase} disabled={isPurchasing}>
          {isPurchasing ? 'Opening Stripe checkout…' : 'Purchase via Stripe'}
        </button>

        {purchaseMessage && <p className="credit-purchase__feedback success">{purchaseMessage}</p>}
        {purchaseError && <p className="credit-purchase__feedback warning">{purchaseError}</p>}
      </div>
    </section>
  );
};

export default BillingSummary;
