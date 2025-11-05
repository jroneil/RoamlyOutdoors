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

      <BillingSummary billing={profile.billing} userId={profile.uid} contactEmail={profile.contactEmail} />
    </div>
  );
};

export default ProfilePage;
