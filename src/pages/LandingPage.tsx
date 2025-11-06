import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import useAuth from '../hooks/useAuth';

const LandingPage = () => {
  const { isLoading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      navigate('/home', { replace: true });
    }
  }, [navigate, profile]);

  if (profile) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="auth-gate auth-gate__loading">
        <p>Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate__backdrop" aria-hidden="true" />
      <AuthModal />
    </div>
  );
};

export default LandingPage;
