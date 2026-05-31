// ============================================================
// FundMate – Firebase Initialization
// Firebase v10+ modular SDK loaded via CDN importmap in index.html
// ============================================================

import { initializeApp } from 'firebase/app';

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';

import { getAnalytics } from 'firebase/analytics';

// ── Firebase Configuration ──────────────────────────────────
// ⚠️  Replace every value below with YOUR Firebase project config.
//     Find it in the Firebase Console → Project settings → General
//     → Your apps → SDK setup and configuration.
const firebaseConfig = {
  apiKey: "AIzaSyBmmRn_Y1LSBvnuzzjHWHbSE8qT1XaSrdM",
  authDomain: "fundmate-yay.firebaseapp.com",
  projectId: "fundmate-yay",
  storageBucket: "fundmate-yay.firebasestorage.app",
  messagingSenderId: "289149235048",
  appId: "1:289149235048:web:47551a276cdcb3f5a630dd",
  measurementId: "G-Y2N1X1R6SR"
};

// ── Initialise Firebase ─────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
  experimentalAutoDetectLongPolling: true
});
const auth = getAuth(app);
const analytics = getAnalytics(app);

// ── Auth Helper ─────────────────────────────────────────────

/**
 * Sign in anonymously and return the Firebase User object.
 * If the user is already signed in, resolves immediately.
 */
function initAuth() {
  return new Promise((resolve, reject) => {
    // Check if already signed in
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub(); // stop listening after first callback
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch(reject);
      }
    }, reject);
  });
}

// ── Firestore Helpers ───────────────────────────────────────

/**
 * Return a DocumentReference for a household.
 * @param {string} householdId
 */
function getHouseholdRef(householdId) {
  return doc(db, 'households', householdId);
}

// ── Exports ─────────────────────────────────────────────────

export {
  // Firebase instances
  app,
  db,
  auth,

  // Auth
  initAuth,
  onAuthStateChanged,

  // Firestore helpers
  getHouseholdRef,

  // Re‑export Firestore SDK functions so db.js only imports from here
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
};

// Expose to window for app.js
window.fb = {
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  initAuth
};
