import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let adminInstance = null;
let adminInitialized = false;
let adminLoadError = null;

const loadAdmin = () => {
  if (adminInitialized) {
    return adminInstance;
  }

  adminInitialized = true;

  try {
    adminInstance = require('firebase-admin');
  } catch (error) {
    adminLoadError = error;
    adminInstance = null;
  }

  if (!adminInstance && adminLoadError) {
    console.warn('Unable to load firebase-admin. Billing sync will be disabled.', adminLoadError);
  }

  return adminInstance;
};

export const getFirebaseAdmin = () => loadAdmin();

let firestoreInstance = null;

export const getFirestore = () => {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    const admin = loadAdmin();

    if (!admin) {
      return null;
    }

    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;

      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId || undefined
      });
    }

    firestoreInstance = admin.firestore();
  } catch (error) {
    console.warn('Unable to initialize firebase-admin. Billing sync will be disabled.', error);
    firestoreInstance = null;
  }

  return firestoreInstance;
};
