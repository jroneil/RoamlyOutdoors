import type { BillingProfile } from '../../types/user';

interface BillingSummaryProps {
  billing: BillingProfile;
}

const statusCopy: Record<BillingProfile['subscriptionStatus'], string> = {
  active: 'Your subscription is active and in good standing.',
  trialing: 'You are currently in a trial period. Enjoy exploring the platform!',
  past_due: 'Payment is past due. Please update your billing details to avoid disruptions.',
  canceled: 'Your subscription has been canceled.',
  none: 'No subscription on file yet. Upgrade when you are ready.'
};

const BillingSummary = ({ billing }: BillingSummaryProps) => {
  const {
    stripeCustomerId,
    subscriptionStatus,
    packageName,
    renewalDate,
    managedBy
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
          <dt>Next renewal</dt>
          <dd>{renewalDate ? new Date(renewalDate).toLocaleDateString() : 'Not scheduled'}</dd>
        </div>
        <div>
          <dt>Stripe customer ID</dt>
          <dd>{stripeCustomerId ?? 'Pending'}</dd>
        </div>
        <div>
          <dt>Managed by</dt>
          <dd>{managedBy === 'manual' ? 'Manual billing' : 'Stripe portal'}</dd>
        </div>
      </dl>
    </section>
  );
};

export default BillingSummary;
