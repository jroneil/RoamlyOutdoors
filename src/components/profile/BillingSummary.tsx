import type { BillingProfile } from '../../types/user';

interface BillingSummaryProps {
  billing: BillingProfile;
  onManageSubscription?: () => void;
  isPortalLoading?: boolean;
  portalError?: string | null;
}

const statusCopy: Record<BillingProfile['subscriptionStatus'], string> = {
  active: 'Your subscription is active and in good standing.',
  trialing: 'You are currently in a trial period. Enjoy exploring the platform!',
  past_due: 'Payment is past due. Please update your billing details to avoid disruptions.',
  canceled: 'Your subscription has been canceled.',
  none: 'No subscription on file yet. Upgrade when you are ready.'
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
        <h2>Subscription &amp; Packages</h2>
        <span className={`status-badge status-${subscriptionStatus}`}>{subscriptionStatus}</span>
      </header>
      <p className="profile-card__description">{statusCopy[subscriptionStatus]}</p>
      <dl className="profile-card__details">
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
