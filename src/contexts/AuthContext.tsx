import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { User } from 'firebase/auth';
import { loginWithEmail, loginWithGoogle, logout, subscribeToAuthChanges } from '../services/auth';
import type { AppUser } from '../types/user';

interface AuthState {
  isLoading: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
}

interface AuthContextValue extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  isLoading: true,
  firebaseUser: null,
  profile: null
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(({ firebaseUser, profile }) => {
      setState({ isLoading: false, firebaseUser, profile });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    await loginWithGoogle();
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginWithEmail: handleEmailLogin,
      loginWithGoogle: handleGoogleLogin,
      logout: handleLogout
    }),
    [handleEmailLogin, handleGoogleLogin, handleLogout, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};
