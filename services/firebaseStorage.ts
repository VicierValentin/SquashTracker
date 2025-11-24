import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import { User, Tournament, Match, UserRole, TournamentType, MatchStatus, PoolStandings, AuditLog } from '../types';

// Firebase-based Storage Service for Multi-User Support
class FirebaseStorageService {
  private currentUser: User | null = null;
  private unsubscribers: Unsubscribe[] = [];

  // --- Auth & Users ---

  async initAuth(callback: (user: User | null) => void) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          this.currentUser = userData;
          callback(userData);
        } else {
          this.currentUser = null;
          callback(null);
        }
      } else {
        this.currentUser = null;
        callback(null);
      }
    });
  }

  async register(username: string, displayName: string, email: string, password: string): Promise<User> {
    // Check if username already exists
    const usersQuery = query(collection(db, 'users'), where('login', '==', username));
    const existingUsers = await getDocs(usersQuery);
    
    if (!existingUsers.empty) {
      throw new Error('Username already exists');
    }

    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Create user document
    const newUser: User = {
      login: username,
      displayName,
      role: UserRole.PLAYER,
      createdAt: new Date().toISOString(),
      club: 'Unattached',
      ranking: 1000,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    this.currentUser = newUser;
    return newUser;
  }

  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data() as User;
    this.currentUser = userData;
    return userData;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async logout() {
    await signOut(auth);
    this.currentUser = null;
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  async getAllUsers(): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => doc.data() as User);
  }

  async updateUser(updatedUser: User, actor: string) {
    const usersQuery = query(collection(db, 'users'), where('login', '==', updatedUser.login));
    const userDocs = await getDocs(usersQuery);
    
    if (!userDocs.empty) {
      const userDoc = userDocs.docs[0];
      await updateDoc(userDoc.ref, updatedUser as any);
      await this.logAudit(actor, 'UPDATE', 'USER', updatedUser.login, `Updated profile for ${updatedUser.displayName}`);
      
      if (this.currentUser && this.currentUser.login === updatedUser.login) {
        this.currentUser = updatedUser;
      }
    }
  }

  // --- Tournaments ---

  async createTournament(t: Omit<Tournament, 'id'>, actor: string): Promise<Tournament> {
    const tournamentRef = doc(collection(db, 'tournaments'));
    const newTournament: Tournament = {
      ...t,
      id: tournamentRef.id,
    };

    await setDoc(tournamentRef, newTournament);
    await this.logAudit(actor, 'CREATE', 'TOURNAMENT', newTournament.id, `Created tournament ${t.title}`);
    return newTournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      orderBy('startDate', 'desc')
    );
    const snapshot = await getDocs(tournamentsQuery);
    return snapshot.docs.map(doc => doc.data() as Tournament);
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
    return tournamentDoc.exists() ? (tournamentDoc.data() as Tournament) : undefined;
  }

  async joinTournament(tournamentId: string, userLogin: string) {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      const tournament = tournamentDoc.data() as Tournament;
      if (!tournament.participants.includes(userLogin)) {
        tournament.participants.push(userLogin);
        await updateDoc(tournamentRef, { participants: tournament.participants });
        await this.logAudit(userLogin, 'UPDATE', 'TOURNAMENT', tournamentId, 'Joined tournament');
      }
    }
  }

  // --- Matches & Scoring ---

  async getAllMatches(): Promise<Match[]> {
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    return matchesSnapshot.docs.map(doc => doc.data() as Match);
  }

  async getMatchesForTournament(tournamentId: string): Promise<Match[]> {
    const matchesQuery = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId)
    );
    const snapshot = await getDocs(matchesQuery);
    return snapshot.docs.map(doc => doc.data() as Match);
  }

  async updateMatch(updatedMatch: Match, actor: string) {
    const batch = writeBatch(db);
    const matchRef = doc(db, 'matches', updatedMatch.id);
    
    // Update match
    batch.set(matchRef, updatedMatch);
    
    // Recalculate standings if needed
    if (updatedMatch.poolId) {
      const matches = await this.getMatchesForTournament(updatedMatch.tournamentId);
      const updatedStandings = await this.recalculatePoolStandings(
        updatedMatch.tournamentId,
        updatedMatch.poolId,
        matches
      );
      
      // Update standings
      for (const standing of updatedStandings) {
        const standingRef = doc(db, 'standings', `${standing.tournamentId}_${standing.poolId}_${standing.login}`);
        batch.set(standingRef, standing);
      }
    }
    
    await batch.commit();
    await this.logAudit(actor, 'UPDATE', 'MATCH', updatedMatch.id, `Score update: ${updatedMatch.playerALogin} vs ${updatedMatch.playerBLogin}`);
  }

  private async recalculatePoolStandings(
    tournamentId: string,
    poolId: string,
    allMatches: Match[]
  ): Promise<PoolStandings[]> {
    const poolMatches = allMatches.filter(m => m.tournamentId === tournamentId && m.poolId === poolId);
    const players = Array.from(new Set(poolMatches.flatMap(m => [m.playerALogin, m.playerBLogin])));

    return players.map(login => {
      const stats: PoolStandings = {
        login,
        tournamentId,
        poolId,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        pointsDiff: 0,
      };

      poolMatches.forEach(m => {
        if (m.status !== MatchStatus.COMPLETED) return;
        const isA = m.playerALogin === login;
        const isB = m.playerBLogin === login;
        if (!isA && !isB) return;

        stats.matchesPlayed++;
        if (m.winnerLogin === login) stats.matchesWon++;
        else stats.matchesLost++;

        if (m.completedAt && (!stats.lastPlayedAt || m.completedAt > stats.lastPlayedAt)) {
          stats.lastPlayedAt = m.completedAt;
        }

        m.scores.forEach(g => {
          if (isA) {
            stats.pointsWon += g.playerAScore;
            stats.pointsLost += g.playerBScore;
            if (g.playerAScore > g.playerBScore) stats.gamesWon++;
            else stats.gamesLost++;
          } else {
            stats.pointsWon += g.playerBScore;
            stats.pointsLost += g.playerAScore;
            if (g.playerBScore > g.playerAScore) stats.gamesWon++;
            else stats.gamesLost++;
          }
        });
      });

      stats.pointsDiff = stats.pointsWon - stats.pointsLost;
      return stats;
    });
  }

  async getStandings(tournamentId: string): Promise<PoolStandings[]> {
    const standingsQuery = query(
      collection(db, 'standings'),
      where('tournamentId', '==', tournamentId)
    );
    const snapshot = await getDocs(standingsQuery);
    return snapshot.docs.map(doc => doc.data() as PoolStandings);
  }

  // --- Schedule Generation ---

  async generateSchedule(tournamentId: string, actor: string) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return;

    const batch = writeBatch(db);
    
    // Delete existing matches for this tournament (that aren't completed)
    const existingMatches = await this.getMatchesForTournament(tournamentId);
    existingMatches
      .filter(m => m.status !== MatchStatus.COMPLETED)
      .forEach(m => {
        batch.delete(doc(db, 'matches', m.id));
      });

    const players = [...tournament.participants];
    const newMatches: Match[] = [];

    if (tournament.type === TournamentType.ROUND_ROBIN) {
      const poolSize = tournament.poolSize || 4;
      const numPools = Math.ceil(players.length / poolSize);
      const pools: string[][] = Array.from({ length: numPools }, () => []);

      players.forEach((p, i) => {
        pools[i % numPools].push(p);
      });

      pools.forEach((poolPlayers, poolIndex) => {
        const poolId = `Pool ${String.fromCharCode(65 + poolIndex)}`;
        for (let i = 0; i < poolPlayers.length; i++) {
          for (let j = i + 1; j < poolPlayers.length; j++) {
            const matchRef = doc(collection(db, 'matches'));
            const match: Match = {
              id: matchRef.id,
              tournamentId: tournament.id,
              poolId: poolId,
              playerALogin: poolPlayers[i],
              playerBLogin: poolPlayers[j],
              scores: [],
              status: MatchStatus.SCHEDULED,
            };
            batch.set(matchRef, match);
            newMatches.push(match);
          }
        }
      });
    } else {
      // Single Elimination
      for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
          const matchRef = doc(collection(db, 'matches'));
          const match: Match = {
            id: matchRef.id,
            tournamentId: tournament.id,
            round: 1,
            playerALogin: players[i],
            playerBLogin: players[i + 1],
            scores: [],
            status: MatchStatus.SCHEDULED,
          };
          batch.set(matchRef, match);
          newMatches.push(match);
        }
      }
    }

    // Update tournament status
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    batch.update(tournamentRef, { status: 'Active' });

    // Initialize standings
    const uniquePools = Array.from(new Set(newMatches.map(m => m.poolId).filter(Boolean) as string[]));
    for (const poolId of uniquePools) {
      const standings = await this.recalculatePoolStandings(tournamentId, poolId, newMatches);
      standings.forEach(standing => {
        const standingRef = doc(db, 'standings', `${tournamentId}_${poolId}_${standing.login}`);
        batch.set(standingRef, standing);
      });
    }

    await batch.commit();
    await this.logAudit(actor, 'UPDATE', 'TOURNAMENT', tournamentId, 'Generated schedule');
  }

  // --- Real-time Listeners ---

  subscribeTournaments(callback: (tournaments: Tournament[]) => void): Unsubscribe {
    const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournaments = snapshot.docs.map(doc => doc.data() as Tournament);
      callback(tournaments);
    });
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  subscribeMatches(tournamentId: string, callback: (matches: Match[]) => void): Unsubscribe {
    const q = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map(doc => doc.data() as Match);
      callback(matches);
    });
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  subscribeStandings(tournamentId: string, callback: (standings: PoolStandings[]) => void): Unsubscribe {
    const q = query(collection(db, 'standings'), where('tournamentId', '==', tournamentId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const standings = snapshot.docs.map(doc => doc.data() as PoolStandings);
      callback(standings);
    });
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // --- Audit ---

  private async logAudit(actor: string, action: AuditLog['action'], targetType: AuditLog['targetType'], targetId: string, details: string) {
    const auditRef = doc(collection(db, 'audit'));
    const log: AuditLog = {
      id: auditRef.id,
      timestamp: new Date().toISOString(),
      actorLogin: actor,
      action,
      targetType,
      targetId,
      details,
    };
    await setDoc(auditRef, log);
  }
}

export const firebaseDb = new FirebaseStorageService();
