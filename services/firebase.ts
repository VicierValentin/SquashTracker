import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration
// These values should be replaced with your actual Firebase project credentials
// For security, these are public identifiers - no sensitive data
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase is properly configured
const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.warn('Firebase is not properly configured. Please check your environment variables.');
    throw error;
  }
} else {
  console.warn('Firebase configuration missing. Multi-user mode will not work. See docs/MULTI_USER_SETUP.md for setup instructions.');
  // Throw error when Firebase methods are accessed without configuration
  const notConfiguredError = () => {
    throw new Error('Firebase is not configured. Set VITE_USE_FIREBASE=false or configure Firebase. See docs/MULTI_USER_SETUP.md');
  };
  app = new Proxy({} as FirebaseApp, {
    get: notConfiguredError
  });
  auth = new Proxy({} as Auth, {
    get: notConfiguredError
  });
  db = new Proxy({} as Firestore, {
    get: notConfiguredError
  });
}

export { app, auth, db };
