import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

/**
 * Variables obligatorias (Vite): copie `.env.example` → `.env` en desarrollo y CI.
 * No se incluyen valores por defecto del proyecto en el código fuente.
 */
function req(name) {
  const v = import.meta.env[name];
  if (v == null || String(v).trim() === '') {
    throw new Error(
      `[Firebase] Falta la variable de entorno ${name}. ` +
        'Defina VITE_FIREBASE_* en un archivo .env (vea .env.example).',
    );
  }
  return String(v).trim();
}

const firebaseConfig = {
  apiKey: req('VITE_FIREBASE_API_KEY'),
  authDomain: req('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: req('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: req('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: req('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: req('VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const app = initializeApp(firebaseConfig);

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, functionsRegion);
export default app;
