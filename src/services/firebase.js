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

const app = initializeApp(firebaseConfig);

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, functionsRegion);
export default app;