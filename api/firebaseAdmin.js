import admin from 'firebase-admin';

let firestoreInstance = null;

export const getFirestore = () => {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
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
