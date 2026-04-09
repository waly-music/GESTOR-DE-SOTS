import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAPBqGAvmHfwq6kWd30z7ZC7WQpBrSw7Yk",
  authDomain: "gestion-sots.firebaseapp.com",
  projectId: "gestion-sots",
  storageBucket: "gestion-sots.firebasestorage.app",
  messagingSenderId: "38819886180",
  appId: "1:38819886180:web:ac2c3c0c6a1b4afbd4db71",
  measurementId: "G-RK3Q4HXV2X"
};

function validateConfig() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_gestion-sots',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  const missing = required.filter((k) => !import.meta.env[k]);
  if (missing.length) {
    console.warn(
      '[Firebase] Faltan variables de entorno:',
      missing.join(', '),
    );
  }
}

validateConfig();

const app = initializeApp(firebaseConfig);

/** Debe coincidir con la región de `createUserWithProfile` en `functions/index.js`. */
const functionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, functionsRegion);
export default app;
