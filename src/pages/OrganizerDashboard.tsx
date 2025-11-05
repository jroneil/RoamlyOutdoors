import useAuth from '../hooks/useAuth';

const OrganizerDashboard = () => {
  const { profile } = useAuth();

  return (
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
    </section>
  );
};

export default OrganizerDashboard;
