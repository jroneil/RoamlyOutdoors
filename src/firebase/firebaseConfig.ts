import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

type FirebaseConfigKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID';

const getConfigValue = (key: FirebaseConfigKey) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getConfigValue('VITE_FIREBASE_API_KEY'),
  authDomain: getConfigValue('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getConfigValue('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getConfigValue('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getConfigValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getConfigValue('VITE_FIREBASE_APP_ID')
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
