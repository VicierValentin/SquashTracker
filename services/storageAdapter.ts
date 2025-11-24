// Storage Adapter - switches between localStorage and Firebase based on configuration
import { db as localDb } from './storage';
import { firebaseDb } from './firebaseStorage';

// Feature flag to enable Firebase
// Set to true to use Firebase, false to use localStorage
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true' || false;

// Export the appropriate storage service
export const storageService = USE_FIREBASE ? firebaseDb : localDb;

// Export flag for UI to show multi-user features
export const isMultiUserEnabled = USE_FIREBASE;
