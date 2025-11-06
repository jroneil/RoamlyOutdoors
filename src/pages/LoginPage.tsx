import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const LoginPage = () => {
  const { loginWithEmail, loginWithGoogle, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/home', { replace: true });
    }
  }, [navigate, profile]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in with email right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in with Google right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to manage your outdoor events and subscriptions.</p>

        <form className="auth-form" onSubmit={handleEmailLogin}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="organizer@roamly.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          Continue with Google
        </button>
      </section>
    </div>
  );
};

export default LoginPage;
