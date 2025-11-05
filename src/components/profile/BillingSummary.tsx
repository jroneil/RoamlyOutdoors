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

const BillingSummary = ({ billing, onManageSubscription, isPortalLoading, portalError }: BillingSummaryProps) => {
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
    lastPaymentError
  } = billing;

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
          <dt>Plan ID</dt>
          <dd>{planId ?? 'Not assigned'}</dd>
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
          <dt>Stripe subscription ID</dt>
          <dd>{stripeSubscriptionId ?? 'Pending'}</dd>
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
          <button type="button" className="primary" onClick={() => onManageSubscription()} disabled={isPortalLoading}>
            {isPortalLoading ? 'Loading portal…' : 'Manage subscription'}
          </button>
          {portalError ? <p className="error-text">{portalError}</p> : null}
        </div>
      ) : null}
    </section>
  );
};

export default BillingSummary;
