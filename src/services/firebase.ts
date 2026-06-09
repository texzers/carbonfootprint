import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// All values come from environment variables — never hard-coded.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ─── Initialize App (singleton) ───────────────────────────────────────────────

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ─── Firestore with offline persistence ──────────────────────────────────────

export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Enable offline persistence (IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence only available in one
    console.warn('Firestore persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = getAuth(app);

// Persist session across browser restarts
setPersistence(auth, browserLocalPersistence);

// Google provider with Select Account prompt
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Analytics (optional, browser only) ──────────────────────────────────────

export const analytics = isSupported().then((yes) =>
  yes ? getAnalytics(app) : null
);

export default app;
