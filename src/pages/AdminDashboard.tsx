import useAuth from '../hooks/useAuth';
import PlanManagementPanel from '../components/admin/PlanManagementPanel';

const AdminDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="admin-dashboard">
      <section className="card dashboard-card">
        <h1>Admin control center</h1>
        <p>
          Review platform health, manage billing escalations, and oversee organizer access controls.
        </p>
        <ul className="dashboard-list">
          <li>
            <strong>Current role:</strong> {profile?.role}
          </li>
          <li>
            <strong>Stripe customer ID:</strong> {profile?.billing.stripeCustomerId ?? 'Not linked'}
          </li>
          <li>
            <strong>Subscription status:</strong> {profile?.billing.subscriptionStatus}
          </li>
          <li>
            <strong>Plan:</strong> {profile?.billing.packageName ?? 'Unassigned'}
          </li>
          <li>
            <strong>Next renewal:</strong>{' '}
            {profile?.billing.renewalDate ? new Date(profile.billing.renewalDate).toLocaleDateString() : 'Not scheduled'}
          </li>
        </ul>
      </section>

      <PlanManagementPanel />
    </div>
  );
};

export default AdminDashboard;
