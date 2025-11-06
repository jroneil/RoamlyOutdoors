import { useState, type FormEvent } from 'react';
import useAuth from '../../hooks/useAuth';

const AuthModal = () => {
  const { loginWithEmail, loginWithGoogle, registerWithEmail } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'sign-in') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(displayName, email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to process your request.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: 'sign-in' | 'sign-up') => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div className="auth-modal card">
      <div className="auth-modal__header">
        <button
          type="button"
          className={`auth-modal__tab${mode === 'sign-in' ? ' is-active' : ''}`}
          onClick={() => switchMode('sign-in')}
          disabled={isSubmitting}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`auth-modal__tab${mode === 'sign-up' ? ' is-active' : ''}`}
          onClick={() => switchMode('sign-up')}
          disabled={isSubmitting}
        >
          Create account
        </button>
      </div>

      <div className="auth-modal__body">
        <h1>{mode === 'sign-in' ? 'Welcome back' : 'Join the community'}</h1>
        <p className="auth-subtitle">
          {mode === 'sign-in'
            ? 'Sign in to manage adventures, RSVPs and billing.'
            : 'Create an account to start organizing outdoor events.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'sign-up' ? (
            <label>
              Full name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Sierra Ridge"
                required
              />
            </label>
          ) : null}

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
            {isSubmitting
              ? mode === 'sign-in'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'sign-in'
              ? 'Sign in'
              : 'Sign up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button type="button" className="secondary" onClick={() => void handleGoogleLogin()} disabled={isSubmitting}>
          Continue with Google
        </button>
      </div>

      <p className="auth-modal__switch">
        {mode === 'sign-in' ? 'New to Roamly Outdoors?' : 'Already have an account?'}{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          disabled={isSubmitting}
        >
          {mode === 'sign-in' ? 'Create one now.' : 'Sign in instead.'}
        </button>
      </p>
    </div>
  );
};

export default AuthModal;
