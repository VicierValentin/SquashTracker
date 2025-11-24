# Data Storage on GitHub Pages

## Summary

**Yes, this SquashTracker app hosted on GitHub Pages CAN store data like IDs and match results.**

However, there are important considerations and limitations you should understand.

## How Data Storage Works

### LocalStorage Implementation

This application uses **browser localStorage** for data persistence. Here's what that means:

- **Data is stored locally** in the user's web browser (not on GitHub's servers)
- **Each browser/device combination** has its own separate data storage
- **Data persists** across browser sessions (closing and reopening the browser)
- **Data is automatically saved** whenever you:
  - Register or login as a user
  - Create a tournament
  - Update match scores
  - Join a tournament
  - Update your profile

### What Gets Stored

The app stores the following data types in localStorage:

1. **Users** (`squash_users`) - User profiles including:
   - Login credentials (username)
   - Display name, club, ranking
   - Role (PLAYER or ADMIN)
   - Profile details

2. **Tournaments** (`squash_tournaments`) - Tournament information:
   - Tournament ID, title, description
   - Start date, type (Round Robin or Single Elimination)
   - Status (Draft, Active, Completed)
   - Participant list

3. **Matches** (`squash_matches`) - Match data:
   - Match ID and tournament association
   - Player assignments
   - Game scores
   - Match status and completion time

4. **Standings** (`squash_standings`) - Pool standings calculations:
   - Wins, losses, points
   - Automatically recalculated after each match update

5. **Audit Logs** (`squash_audit`) - Activity tracking:
   - User actions and timestamps
   - Tournament and match updates

6. **Current User Session** (`squash_current_user`) - Active login state

## Key Limitations

### 🔴 Data is NOT Shared Between Users

- Each person using the app on their own device/browser sees **only their local data**
- If you create a tournament on your laptop, you won't see it on your phone
- Other users won't see tournaments or matches you created

### 🔴 Data Can Be Lost

Data will be lost if:
- Browser cache/cookies are cleared
- Browser is uninstalled
- Private/Incognito mode is closed
- Different browser or device is used

### 🔴 No Central Database

- There is no server-side database
- GitHub Pages only hosts static files (HTML, CSS, JavaScript)
- All data processing happens in the user's browser

## Use Cases

### ✅ What This App IS Good For:

- **Personal tracking** of your own squash matches and tournaments
- **Single-device usage** where one person manages everything on one computer
- **Demo or testing purposes** to see how the tournament system works
- **Offline-capable** tournament management (works without internet after initial load)

### ❌ What This App Is NOT Suitable For:

- **Multi-user tournaments** where different players need to see the same data
- **Real-time score updates** visible to all participants
- **Cross-device synchronization** (e.g., updating on phone, viewing on computer)
- **Permanent/backup storage** for important tournament data

## Technical Details

### Storage Location

The data is stored using the Web Storage API:
```javascript
// Example from services/storage.ts
private read<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
}

private write(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}
```

### Storage Keys Used

- `squash_users` - User accounts
- `squash_tournaments` - Tournament definitions
- `squash_matches` - Match results and scores
- `squash_standings` - Calculated standings
- `squash_audit` - Audit trail
- `squash_current_user` - Active session

### Browser Compatibility

localStorage is supported in all modern browsers:
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Typical storage limit: 5-10 MB per domain

## Recommendations

### For Personal Use:
1. ✅ Use the app as-is for personal tournament tracking
2. ⚠️ Export/backup important data periodically (manual copy from browser developer tools)
3. ⚠️ Don't clear browser data if you want to keep your tournaments

### For Multi-User Tournaments:
To make this app work for real tournaments with multiple users, you would need to add:

1. **Backend Server** - A database (Firebase, Supabase, or custom server)
2. **Real-time Sync** - WebSocket or polling for live updates
3. **Authentication** - Proper user accounts with passwords
4. **API Layer** - RESTful API to read/write shared data

Example services that could be integrated:
- Firebase Realtime Database or Firestore
- Supabase (PostgreSQL-based)
- AWS DynamoDB
- PocketBase (self-hosted)

### Quick Test

To verify data persistence yourself:

1. Open the app in your browser
2. Register/login and create a tournament
3. Close the browser completely
4. Reopen and navigate back to the app
5. Your tournament should still be there! ✅

To see the stored data:
1. Open browser Developer Tools (F12)
2. Go to "Application" or "Storage" tab
3. Expand "Local Storage"
4. Click on your domain
5. You'll see all the `squash_*` keys with your data

## Conclusion

**The SquashTracker app DOES store IDs and match results** using browser localStorage, which persists data on the user's local device. This works perfectly for personal use or single-computer scenarios, but is not designed for multi-user collaborative tournaments where different people need to see and update the same shared data in real-time.

For production use with multiple users, consider integrating a backend database service.
