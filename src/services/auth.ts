import {
  GoogleAuthProvider,
  type NextOrObserver,
  type User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import type { AppUser } from '../types/user';
import { getOrCreateUserProfile } from './users';

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

export const logout = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (
  listener: (state: AuthStateChange) => void | Promise<void>
) => {
  const handleChange: AuthObserver = async (firebaseUser) => {
    if (!firebaseUser) {
      listener({ firebaseUser: null, profile: null });
      return;
    }

    try {
      const profile = await getOrCreateUserProfile(firebaseUser);
      listener({ firebaseUser, profile });
    } catch (error) {
      console.error(error);
      listener({ firebaseUser, profile: null });
    }
  };

  return onAuthStateChanged(auth, handleChange, console.error);
};
