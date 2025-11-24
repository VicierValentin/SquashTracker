# Storage Architecture

## Overview

SquashTracker uses browser localStorage for client-side data persistence when hosted on GitHub Pages.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages                              │
│  (Static File Hosting - HTML, CSS, JavaScript)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Downloads static files
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   User's Browser                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         React Application (In Memory)               │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │   StorageService (services/storage.ts)       │  │    │
│  │  │                                               │  │    │
│  │  │  - login()         - createTournament()      │  │    │
│  │  │  - register()      - updateMatch()           │  │    │
│  │  │  - getAllUsers()   - generateSchedule()      │  │    │
│  │  └──────────────┬───────────────────────────────┘  │    │
│  │                 │ read() / write()                  │    │
│  │                 ▼                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │      Browser localStorage API                 │  │    │
│  │  │                                               │  │    │
│  │  │  Key-Value Pairs (JSON strings):             │  │    │
│  │  │  ├─ squash_users                             │  │    │
│  │  │  ├─ squash_tournaments                        │  │    │
│  │  │  ├─ squash_matches                            │  │    │
│  │  │  ├─ squash_standings                          │  │    │
│  │  │  ├─ squash_audit                              │  │    │
│  │  │  └─ squash_current_user                       │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  💾 Data persists in browser's local storage                │
│     (Typical limit: 5-10 MB)                                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Creating a Tournament

```
1. User clicks "Create Tournament" button
   ↓
2. React form collects tournament details
   ↓
3. Form submission calls: db.createTournament(data, actor)
   ↓
4. StorageService.createTournament():
   - Generates unique ID
   - Reads existing tournaments from localStorage
   - Adds new tournament to array
   - Writes updated array to localStorage key 'squash_tournaments'
   - Logs action to 'squash_audit'
   ↓
5. React re-renders to show new tournament
   ↓
6. Data persists across browser restarts ✓
```

## Data Flow Example: Recording Match Results

```
1. User enters match scores
   ↓
2. Submit triggers: db.updateMatch(matchData, actor)
   ↓
3. StorageService.updateMatch():
   - Reads 'squash_matches' from localStorage
   - Updates specific match with new scores
   - Recalculates pool standings
   - Writes matches to 'squash_matches'
   - Writes standings to 'squash_standings'
   - Logs action to 'squash_audit'
   ↓
4. React updates UI with new scores and standings
   ↓
5. All data persists in localStorage ✓
```

## Storage Keys and Data Types

| Key | Data Type | Description | Example Size |
|-----|-----------|-------------|--------------|
| `squash_users` | Array<User> | User profiles and credentials | 2-5 KB |
| `squash_tournaments` | Array<Tournament> | Tournament configurations | 1-3 KB per tournament |
| `squash_matches` | Array<Match> | Match results and scores | 500 bytes per match |
| `squash_standings` | Array<PoolStandings> | Calculated standings | 300 bytes per player |
| `squash_audit` | Array<AuditLog> | Activity audit trail | 200 bytes per log |
| `squash_current_user` | User | Active session | 500 bytes |

## Benefits

✅ **No Backend Required** - Works entirely client-side  
✅ **Fast Performance** - All data access is instant (in-memory)  
✅ **Offline Capable** - Works without internet after initial load  
✅ **Zero Cost** - No database hosting fees  
✅ **Privacy** - Data stays on user's device  

## Limitations

❌ **Not Shared** - Each user sees only their own data  
❌ **Device-Specific** - Different devices have separate data  
❌ **Can Be Lost** - Clearing browser cache deletes all data  
❌ **Storage Limits** - Typically 5-10 MB per domain  
❌ **No Backup** - Users must manually export data  

## When to Use This Architecture

### ✅ Good For:
- Personal tournament tracking
- Single-user applications
- Demos and prototypes
- Offline-first applications
- Privacy-sensitive applications

### ❌ Not Good For:
- Multi-user collaboration
- Real-time updates across devices
- Large-scale tournaments
- Production systems requiring data backup
- Applications needing data analytics

## Upgrading to Multi-User

To support multiple users sharing tournament data, you would need to:

1. **Add a Backend Database**
   - Options: Firebase, Supabase, PostgreSQL, MongoDB
   - Replace localStorage calls with API calls

2. **Implement Authentication**
   - Real password-based auth (not just username)
   - JWT tokens or session management

3. **Add Real-Time Sync**
   - WebSockets or Server-Sent Events
   - Optimistic UI updates with conflict resolution

4. **Handle Concurrency**
   - Prevent simultaneous edits to same match
   - Transaction handling for standings updates

## Code Reference

See `services/storage.ts` for the complete StorageService implementation that handles all localStorage operations.
