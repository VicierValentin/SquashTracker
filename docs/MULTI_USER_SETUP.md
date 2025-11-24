# Multi-User Setup Guide

This guide explains how to enable multi-user support for SquashTracker using Firebase.

## Overview

By default, SquashTracker uses **localStorage** for single-user, single-device usage. To enable **multi-user support** with shared tournament data across devices, you need to:

1. Create a Firebase project
2. Configure Firebase in your app
3. Deploy Firestore security rules
4. Enable the Firebase feature flag

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "SquashTracker")
4. Follow the wizard to create the project
5. Once created, click on the web icon (</>) to add a web app
6. Register your app with a nickname (e.g., "SquashTracker Web")

## Step 2: Get Firebase Configuration

After registering your web app, Firebase will show you a configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   
   # Enable Firebase (set to 'true' for multi-user mode)
   VITE_USE_FIREBASE=true
   ```

## Step 4: Enable Firebase Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Save changes

## Step 5: Create Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose production mode (we'll add security rules next)
4. Select a location closest to your users
5. Click "Enable"

## Step 6: Deploy Firestore Security Rules

Create firestore security rules to protect your data:

1. In Firebase Console, go to **Firestore Database > Rules**
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUser(userId) {
      return request.auth.uid == userId;
    }
    
    function getUserLogin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.login;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read user profiles
      allow read: if isAuthenticated();
      // Users can only update their own profile
      allow write: if isAuthenticated() && isUser(userId);
    }
    
    // Tournaments collection
    match /tournaments/{tournamentId} {
      // Anyone authenticated can read tournaments
      allow read: if isAuthenticated();
      // Anyone authenticated can create tournaments
      allow create: if isAuthenticated();
      // Only tournament admin can update
      allow update: if isAuthenticated() && 
                       resource.data.adminLogin == getUserLogin();
      // Only tournament admin can delete
      allow delete: if isAuthenticated() && 
                       resource.data.adminLogin == getUserLogin();
    }
    
    // Matches collection
    match /matches/{matchId} {
      // Anyone authenticated can read matches
      allow read: if isAuthenticated();
      // Anyone authenticated can create matches (via schedule generation)
      allow create: if isAuthenticated();
      // Tournament participants can update match scores
      allow update: if isAuthenticated();
      // Tournament admins can delete matches
      allow delete: if isAuthenticated();
    }
    
    // Standings collection
    match /standings/{standingId} {
      // Anyone authenticated can read standings
      allow read: if isAuthenticated();
      // System can write standings (calculated automatically)
      allow write: if isAuthenticated();
    }
    
    // Audit logs collection
    match /audit/{auditId} {
      // Anyone authenticated can read audit logs
      allow read: if isAuthenticated();
      // Anyone authenticated can create audit logs
      allow create: if isAuthenticated();
      // Audit logs cannot be modified or deleted
      allow update, delete: if false;
    }
  }
}
```

3. Click "Publish"

## Step 7: Configure GitHub Actions (Optional)

To deploy with Firebase configuration on GitHub Pages:

1. Go to your GitHub repository **Settings > Secrets and variables > Actions**
2. Add the following secrets:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `USE_FIREBASE` (set to `true`)

3. Update `.github/workflows/deploy.yml` to include environment variables:

```yaml
- name: Build
  run: npm run build
  env:
    NODE_ENV: production
    VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
    VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
    VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
    VITE_USE_FIREBASE: ${{ secrets.USE_FIREBASE }}
```

## Step 8: Test Locally

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and test:
   - Register a new account (requires email and password now)
   - Create a tournament
   - Open another browser/incognito window
   - Register a different account
   - Verify you can see the same tournament!

## Step 9: Deploy

Once tested locally, deploy to GitHub Pages:

```bash
git add .
git commit -m "Enable multi-user support with Firebase"
git push
```

The GitHub Actions workflow will automatically deploy your app.

## Feature Differences

### Single-User Mode (localStorage)
- ✅ No setup required
- ✅ Works offline
- ✅ Fast and simple
- ❌ Data not shared between users
- ❌ Data not synced across devices
- ❌ Can lose data if cache cleared

### Multi-User Mode (Firebase)
- ✅ Data shared between all users
- ✅ Real-time updates
- ✅ Works across devices
- ✅ Data persisted in cloud
- ✅ Proper authentication with email/password
- ❌ Requires Firebase setup
- ❌ Requires internet connection
- ⚠️ Free tier limits: 50K reads, 20K writes per day

## Troubleshooting

### "Firebase not initialized" error
- Check that your `.env.local` file exists and contains valid Firebase config
- Ensure `VITE_USE_FIREBASE=true` is set

### Authentication errors
- Verify Email/Password authentication is enabled in Firebase Console
- Check that email format is valid

### Permission denied errors
- Verify Firestore security rules are deployed correctly
- Check that user is authenticated before making requests

### Real-time updates not working
- Ensure you're using the same Firebase project on all devices
- Check browser console for connection errors

## Cost Considerations

Firebase free tier (Spark plan) includes:

- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited users
- **Hosting**: 10 GB storage, 360 MB/day bandwidth

For most small to medium tournaments, the free tier is sufficient. Monitor usage in Firebase Console.

## Security Best Practices

1. **Never commit** `.env.local` to git (it's in `.gitignore`)
2. **Use GitHub Secrets** for deployment credentials
3. **Review security rules** regularly
4. **Enable reCAPTCHA** in Firebase Auth settings for production
5. **Monitor activity** in Firebase Console for suspicious behavior

## Migration from localStorage

If you have existing data in localStorage and want to migrate to Firebase:

1. Export data from browser console:
   ```javascript
   const data = {
     users: JSON.parse(localStorage.getItem('squash_users')),
     tournaments: JSON.parse(localStorage.getItem('squash_tournaments')),
     matches: JSON.parse(localStorage.getItem('squash_matches'))
   };
   console.log(JSON.stringify(data, null, 2));
   ```

2. Import data manually through Firebase Console or create a migration script

## Support

For issues or questions:
- Check the [Firebase documentation](https://firebase.google.com/docs)
- Review Firestore [security rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
- Open an issue in this repository
