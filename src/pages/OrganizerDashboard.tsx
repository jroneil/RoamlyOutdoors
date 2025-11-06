import useAuth from '../hooks/useAuth';
import { listCreditBundles } from '../services/billing';
import YourGroupsAndEvents from '../components/organizer/YourGroupsAndEvents';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const OrganizerDashboard = () => {
  const { profile } = useAuth();
  const credits = profile?.billing.credits;
  const usage = profile?.billing.usage;
  const bundles = listCreditBundles();

  const usagePercent = usage
    ? Math.min(100, Math.round((usage.monthlyUsed / Math.max(usage.monthlyLimit, 1)) * 100))
    : 0;

  const autoBundle = credits
    ? bundles.find((bundle) => bundle.id === credits.replenishment.bundleId) ?? bundles[0]
    : undefined;

  const replenishmentCopy = credits
    ? credits.replenishment.mode === 'auto'
      ? `Auto-purchase ${autoBundle?.name ?? 'bundle'} when balance hits ${credits.replenishment.threshold} credits.`
      : `Reminder email goes out at ${credits.replenishment.threshold} credits.`
    : null;

  const lowBalanceActive = Boolean(
    credits && credits.balance <= credits.replenishment.threshold
  );

  return (
    <div className="organizer-dashboard">
      <section className="card dashboard-card">
        <h1>Organizer tools</h1>
        <p>
          Plan new outings, update itineraries, and keep tabs on registration numbers with the
          organizer toolkit.
        </p>
        <ul className="dashboard-list">
          <li>
            <strong>Upcoming events:</strong> Manage RSVPs and attendee waitlists.
          </li>
          <li>
            <strong>Package status:</strong> {profile?.billing.packageName ?? 'No package assigned yet.'}
          </li>
          <li>
            <strong>Billing owner:</strong> {profile?.billing.managedBy === 'manual' ? 'Manual' : 'Stripe'}
          </li>
        </ul>

        {credits && usage && (
          <div className="credit-meter">
            <header className="credit-meter__header">
              <h2>Publishing credits</h2>
              <span>{credits.balance} remaining</span>
            </header>
            <div className="credit-meter__bar">
              <div className="credit-meter__fill" style={{ width: `${usagePercent}%` }} />
            </div>
            <p className="credit-meter__description">
              {usage.monthlyUsed} of {usage.monthlyLimit} credits used this cycle. Resets{' '}
              {formatDate(usage.cycleRenewsOn)}.
            </p>
            {replenishmentCopy && <p className="credit-meter__description">{replenishmentCopy}</p>}

            {lowBalanceActive && (
              <div className="credit-meter__alert">
                <strong>Balance running low.</strong>{' '}
                {credits.replenishment.mode === 'auto'
                  ? `Auto-purchase will run automatically${
                      credits.lastAutoPurchaseAt ? ` (last triggered ${formatDate(credits.lastAutoPurchaseAt)})` : ''
                    }.`
                  : `A reminder email was sent ${formatDate(credits.lowBalanceEmailSentAt)}.`}
              </div>
            )}
          </div>
        )}
      </section>

      <YourGroupsAndEvents userId={profile?.uid ?? null} />
    </div>
  );
};

export default OrganizerDashboard;
