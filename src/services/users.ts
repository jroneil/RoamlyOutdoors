import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase/firebaseConfig';
import type { AppUser, BillingProfile, UserDTO } from '../types/user';
import { DEFAULT_USER_DTO } from '../types/user';

const USERS_COLLECTION = 'users';

const toAppUser = (uid: string, data: UserDTO, firebaseUser: User): AppUser => ({
  uid,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
  ...data,
  contactEmail: data.contactEmail || firebaseUser.email || ''
});

export const getOrCreateUserProfile = async (firebaseUser: User): Promise<AppUser> => {
  const ref = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    const nowIso = new Date().toISOString();
    const freshUser: UserDTO = {
      ...DEFAULT_USER_DTO,
      billing: { ...DEFAULT_USER_DTO.billing },
      contactEmail: firebaseUser.email ?? '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(ref, freshUser);
    return toAppUser(firebaseUser.uid, freshUser, firebaseUser);
  }

  const data = snapshot.data() as UserDTO;
  return toAppUser(firebaseUser.uid, data, firebaseUser);
};

export const updateUserProfile = async (uid: string, payload: Partial<UserDTO>) => {
  const ref = doc(db, USERS_COLLECTION, uid);
  const nowIso = new Date().toISOString();
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: nowIso
    },
    { merge: true }
  );
};

export const updateUserBillingProfile = async (uid: string, billing: Partial<BillingProfile>) => {
  await updateUserProfile(uid, { billing } as Partial<UserDTO>);
};
