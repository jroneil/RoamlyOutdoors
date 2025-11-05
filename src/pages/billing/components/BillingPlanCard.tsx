import type { BillingPlan } from '../../../types/billing';
import type { SubscriptionStatus } from '../../../types/user';

interface BillingPlanCardProps {
  plan: BillingPlan;
  isCurrent: boolean;
  subscriptionStatus: SubscriptionStatus;
  isProcessing?: boolean;
  onSelect: (planId: string) => void;
}

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount / 100);

const BillingPlanCard = ({ plan, isCurrent, subscriptionStatus, isProcessing, onSelect }: BillingPlanCardProps) => {
  const { id, name, description, unitAmount, interval, entitlements, currency } = plan;

  return (
    <article className={`plan-card${isCurrent ? ' plan-card--current' : ''}`}>
      <header className="plan-card__header">
        <h3>{name}</h3>
        <p className="plan-card__price">
          {formatPrice(unitAmount, currency)} <span>/{interval}</span>
        </p>
      </header>
      <p className="plan-card__description">{description}</p>
      <ul className="plan-card__entitlements">
        <li>
          <strong>{entitlements.maxEventsPerMonth}</strong> hosted events / month
        </li>
        <li>
          <strong>{entitlements.teamSeats}</strong> team seats included
        </li>
        <li>Support level: {entitlements.supportLevel}</li>
      </ul>
      <footer className="plan-card__footer">
        <button
          type="button"
          className="primary"
          disabled={isCurrent || isProcessing}
          onClick={() => onSelect(id)}
        >
          {isCurrent ? `Current plan (${subscriptionStatus})` : isProcessing ? 'Redirecting…' : 'Select plan'}
        </button>
      </footer>
    </article>
  );
};

export default BillingPlanCard;
