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
import {
  loginWithEmail,
  loginWithGoogle,
  logout,
  registerWithEmail,
  subscribeToAuthChanges
} from '../services/auth';
import { getOrCreateUserProfile } from '../services/users';
import type { AppUser } from '../types/user';
import {
  canUseDeveloperMode,
  getDeveloperProfile,
  isDeveloperModeEnabled,
  subscribeToDeveloperModeChanges
} from '../utils/developerMode';

interface AuthState {
  isLoading: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
}

interface AuthContextValue extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  isLoading: true,
  firebaseUser: null,
  profile: null
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState>(initialState);
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(() =>
    canUseDeveloperMode() ? isDeveloperModeEnabled() : false
  );

  useEffect(() => {
    if (!canUseDeveloperMode()) {
      return;
    }

    const unsubscribe = subscribeToDeveloperModeChanges(() => {
      setDeveloperModeEnabled(isDeveloperModeEnabled());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (developerModeEnabled) {
      setState({ isLoading: false, firebaseUser: null, profile: getDeveloperProfile() });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    const unsubscribe = subscribeToAuthChanges(({ firebaseUser, profile }) => {
      setState({ isLoading: false, firebaseUser, profile });
    });

    return () => {
      unsubscribe();
    };
  }, [developerModeEnabled]);

  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    await loginWithGoogle();
  }, []);

  const handleRegister = useCallback(async (displayName: string, email: string, password: string) => {
    await registerWithEmail(displayName, email, password);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, []);

  const handleRefreshProfile = useCallback(async () => {
    if (!state.firebaseUser) {
      return null;
    }

    const updatedProfile = await getOrCreateUserProfile(state.firebaseUser);
    setState((prev) => ({ ...prev, profile: updatedProfile }));

    return updatedProfile;
  }, [state.firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginWithEmail: handleEmailLogin,
      loginWithGoogle: handleGoogleLogin,
      registerWithEmail: handleRegister,
      logout: handleLogout,
      refreshProfile: handleRefreshProfile
    }),
    [handleEmailLogin, handleGoogleLogin, handleLogout, handleRefreshProfile, handleRegister, state]
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
