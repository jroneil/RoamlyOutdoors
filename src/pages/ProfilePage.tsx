import { Link } from 'react-router-dom';
import BillingSummary from '../components/profile/BillingSummary';
import LoadingState from '../components/common/LoadingState';
import useAuth from '../hooks/useAuth';

const ProfilePage = () => {
  const { isLoading, profile, logout } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!profile) {
    return (
      <div className="card profile-card">
        <h1>Sign in required</h1>
        <p>Please sign in to view your profile details.</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt={profile.displayName ?? profile.contactEmail} />
        ) : (
          <div className="avatar-fallback">{profile.contactEmail.charAt(0).toUpperCase()}</div>
        )}
        <div>
          <h1>{profile.displayName ?? profile.contactEmail}</h1>
          <p className="profile-role">Role: {profile.role}</p>
          <p className="profile-contact">Contact: {profile.contactEmail}</p>
        </div>
        <button className="secondary" type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </header>

      <section className="card profile-card">
        <h2>Organization</h2>
        <p>{profile.organizationName ?? 'No organization information provided yet.'}</p>
        <dl className="profile-card__details">
          <div>
            <dt>Account created</dt>
            <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{new Date(profile.updatedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      <section className="card profile-card">
        <h2>Organizer access</h2>
        {profile.organizerGroupIds?.length ? (
          <>
            <p>
              You're an organizer for {profile.organizerGroupIds.length} group
              {profile.organizerGroupIds.length === 1 ? '' : 's'}.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {profile.organizerGroupIds.map((groupId) => (
                <span key={groupId} className="tag light">
                  {groupId}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p>You haven't been assigned organizer access yet.</p>
        )}
      </section>

      <BillingSummary
        billing={profile.billing}
        userId={profile.uid}
        contactEmail={profile.contactEmail}
      />
      <div className="card profile-card profile-card__actions">
        <Link to="/billing" className="primary-link">
          Go to billing portal
        </Link>
      </div>
    </div>
  );
};

export default ProfilePage;
