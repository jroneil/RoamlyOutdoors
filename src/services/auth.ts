import {
  GoogleAuthProvider,
  type NextOrObserver,
  type Unsubscribe,
  type User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import type { AppUser } from '../types/user';
import { getOrCreateUserProfile, subscribeToUserProfile } from './users';

type AuthStateChange = {
  firebaseUser: User | null;
  profile: AppUser | null;
};

const googleProvider = new GoogleAuthProvider();

type AuthObserver = NextOrObserver<User | null>;

const ensurePersistence = () => setPersistence(auth, browserLocalPersistence);

export const loginWithGoogle = async () => {
  await ensurePersistence();
  await signInWithPopup(auth, googleProvider);
};

export const loginWithEmail = async (email: string, password: string) => {
  await ensurePersistence();
  await signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (displayName: string, email: string, password: string) => {
  await ensurePersistence();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName.trim()) {
    await updateProfile(user, { displayName });
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (
  listener: (state: AuthStateChange) => void | Promise<void>
) => {
  let profileUnsubscribe: Unsubscribe | null = null;

  const cleanupProfileSubscription = () => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
      profileUnsubscribe = null;
    }
  };

  const handleChange: AuthObserver = async (firebaseUser) => {
    cleanupProfileSubscription();

    if (!firebaseUser) {
      listener({ firebaseUser: null, profile: null });
      return;
    }

    try {
      const profile = await getOrCreateUserProfile(firebaseUser);
      listener({ firebaseUser, profile });

      profileUnsubscribe = subscribeToUserProfile(firebaseUser, (updatedProfile) => {
        listener({ firebaseUser, profile: updatedProfile });
      });
    } catch (error) {
      console.error(error);
      listener({ firebaseUser, profile: null });
    }
  };

  const unsubscribeAuth = onAuthStateChanged(auth, handleChange, console.error);

  return () => {
    cleanupProfileSubscription();
    unsubscribeAuth();
  };
};
