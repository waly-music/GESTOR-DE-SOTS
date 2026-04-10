import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAPBqGAvmHfwq6kWd30z7ZC7WQpBrSw7Yk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'gestion-sots.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'gestion-sots',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'gestion-sots.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '38819886180',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:38819886180:web:ac2c3c0c6a1b4afbd4db71',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-RK3Q4HXV2X',
};

const app = initializeApp(firebaseConfig);

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, functionsRegion);
export default app;