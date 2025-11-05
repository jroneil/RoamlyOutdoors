import useAuth from '../hooks/useAuth';

const AdminDashboard = () => {
  const { profile } = useAuth();

  return (
    <section className="card dashboard-card">
      <h1>Admin control center</h1>
      <p>
        Review platform health, manage billing escalations, and oversee organizer access
        controls.
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
      </ul>
    </section>
  );
};

export default AdminDashboard;
