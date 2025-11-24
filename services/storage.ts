import { User, Tournament, Match, UserRole, TournamentType, MatchStatus, GameScore, PoolStandings, AuditLog } from '../types';

// Initial Seed Data
const SEED_USERS: User[] = [
  { login: 'admin', displayName: 'AdminUser', role: UserRole.ADMIN, createdAt: new Date().toISOString(), club: 'City Club', ranking: 1200 },
  { login: 'jdoe', displayName: 'John Doe', role: UserRole.PLAYER, createdAt: new Date().toISOString(), club: 'City Club', ranking: 1150 },
  { login: 'asmith', displayName: 'Alice Smith', role: UserRole.PLAYER, createdAt: new Date().toISOString(), club: 'Westside', ranking: 1300 },
  { login: 'bwayne', displayName: 'Bruce Wayne', role: UserRole.PLAYER, createdAt: new Date().toISOString(), club: 'Gotham', ranking: 1500 },
  { login: 'ckent', displayName: 'Clark Kent', role: UserRole.PLAYER, createdAt: new Date().toISOString(), club: 'Metropolis', ranking: 1450 },
  { login: 'dprince', displayName: 'Diana Prince', role: UserRole.PLAYER, createdAt: new Date().toISOString(), club: 'Themyscira', ranking: 1600 },
];

const KEYS = {
  USERS: 'squash_users',
  TOURNAMENTS: 'squash_tournaments',
  MATCHES: 'squash_matches',
  STANDINGS: 'squash_standings',
  AUDIT: 'squash_audit',
  CURRENT_USER: 'squash_current_user',
};

class StorageService {
  // --- Low Level / "DB" Access ---

  private read<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private write(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Auth & Users ---

  login(login: string): User | null {
    const users = this.read<User[]>(KEYS.USERS, SEED_USERS);
    const user = users.find(u => u.login === login);
    if (user) {
      this.write(KEYS.CURRENT_USER, user);
      // Ensure users are seeded if first run
      if (this.read<User[]>(KEYS.USERS, []).length === 0) {
        this.write(KEYS.USERS, SEED_USERS);
      }
      return user;
    }
    return null;
  }

  register(login: string, displayName: string): User {
    const users = this.read<User[]>(KEYS.USERS, SEED_USERS);
    if (users.find(u => u.login === login)) {
      throw new Error('User already exists');
    }
    const newUser: User = {
      login,
      displayName,
      role: UserRole.PLAYER,
      createdAt: new Date().toISOString(),
      club: 'Unattached',
      ranking: 1000,
    };
    users.push(newUser);
    this.write(KEYS.USERS, users);
    this.write(KEYS.CURRENT_USER, newUser);
    return newUser;
  }

  getCurrentUser(): User | null {
    return this.read<User | null>(KEYS.CURRENT_USER, null);
  }

  logout() {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }

  getAllUsers(): User[] {
    return this.read<User[]>(KEYS.USERS, SEED_USERS);
  }

  updateUser(updatedUser: User, actor: string) {
    const users = this.read<User[]>(KEYS.USERS, SEED_USERS);
    const index = users.findIndex(u => u.login === updatedUser.login);
    if (index !== -1) {
      users[index] = updatedUser;
      this.write(KEYS.USERS, users);
      this.logAudit(actor, 'UPDATE', 'USER', updatedUser.login, `Updated profile for ${updatedUser.displayName}`);
      
      const current = this.getCurrentUser();
      if (current && current.login === updatedUser.login) {
        this.write(KEYS.CURRENT_USER, updatedUser);
      }
    }
  }

  // --- Tournaments ---

  createTournament(t: Omit<Tournament, 'id'>, actor: string): Tournament {
    const tournaments = this.read<Tournament[]>(KEYS.TOURNAMENTS, []);
    const newTournament: Tournament = {
      ...t,
      id: Math.random().toString(36).substr(2, 9),
    };
    tournaments.push(newTournament);
    this.write(KEYS.TOURNAMENTS, tournaments);
    this.logAudit(actor, 'CREATE', 'TOURNAMENT', newTournament.id, `Created tournament ${t.title}`);
    return newTournament;
  }

  getAllTournaments(): Tournament[] {
    return this.read<Tournament[]>(KEYS.TOURNAMENTS, []).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  getTournament(id: string): Tournament | undefined {
    return this.getAllTournaments().find(t => t.id === id);
  }

  joinTournament(tournamentId: string, userLogin: string) {
    const tournaments = this.read<Tournament[]>(KEYS.TOURNAMENTS, []);
    const t = tournaments.find(x => x.id === tournamentId);
    if (t && !t.participants.includes(userLogin)) {
      t.participants.push(userLogin);
      this.write(KEYS.TOURNAMENTS, tournaments);
      this.logAudit(userLogin, 'UPDATE', 'TOURNAMENT', tournamentId, 'Joined tournament');
    }
  }

  // --- Matches & Scoring (Transactional) ---

  getAllMatches(): Match[] {
    return this.read<Match[]>(KEYS.MATCHES, []);
  }

  getMatchesForTournament(tournamentId: string): Match[] {
    return this.getAllMatches().filter(m => m.tournamentId === tournamentId);
  }

  // This is the critical "transactional" method
  updateMatch(updatedMatch: Match, actor: string) {
    // 1. Load all related data
    const matches = this.read<Match[]>(KEYS.MATCHES, []);
    const index = matches.findIndex(m => m.id === updatedMatch.id);
    if (index === -1) throw new Error('Match not found');

    const oldMatch = matches[index];
    const tournament = this.getTournament(updatedMatch.tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    // 2. Update Match
    matches[index] = updatedMatch;
    
    // 3. Update Standings if Match is Completed or changed
    // We recalculate standings for the whole pool to ensure consistency
    let standings = this.read<PoolStandings[]>(KEYS.STANDINGS, []);
    
    if (updatedMatch.poolId) {
       standings = this.recalculatePoolStandings(standings, matches, updatedMatch.tournamentId, updatedMatch.poolId);
    }

    // 4. Commit all changes (Atomic write simulation)
    this.write(KEYS.MATCHES, matches);
    this.write(KEYS.STANDINGS, standings);

    // 5. Audit Log
    this.logAudit(actor, 'UPDATE', 'MATCH', updatedMatch.id, `Score update: ${updatedMatch.playerALogin} vs ${updatedMatch.playerBLogin}`);
  }

  private recalculatePoolStandings(
    currentStandings: PoolStandings[], 
    allMatches: Match[], 
    tournamentId: string, 
    poolId: string
  ): PoolStandings[] {
    // Filter matches for this pool
    const poolMatches = allMatches.filter(m => m.tournamentId === tournamentId && m.poolId === poolId);
    
    // Identify all players
    const players = Array.from(new Set(poolMatches.flatMap(m => [m.playerALogin, m.playerBLogin])));

    // Remove old standings for this pool
    const otherStandings = currentStandings.filter(s => !(s.tournamentId === tournamentId && s.poolId === poolId));
    
    const newPoolStandings: PoolStandings[] = players.map(login => {
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

        // Update last played
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

    return [...otherStandings, ...newPoolStandings];
  }

  getStandings(tournamentId: string): PoolStandings[] {
    return this.read<PoolStandings[]>(KEYS.STANDINGS, []).filter(s => s.tournamentId === tournamentId);
  }

  // --- Logic for Generating Pools/Schedule ---

  generateSchedule(tournamentId: string, actor: string) {
    const tournaments = this.read<Tournament[]>(KEYS.TOURNAMENTS, []);
    const tIndex = tournaments.findIndex(x => x.id === tournamentId);
    if (tIndex === -1) return;
    const t = tournaments[tIndex];

    let allMatches = this.read<Match[]>(KEYS.MATCHES, []);
    // Remove existing scheduled matches for this tourney (reset)
    allMatches = allMatches.filter(m => m.tournamentId !== tournamentId || m.status === MatchStatus.COMPLETED);
    
    const players = [...t.participants]; 
    const newMatches: Match[] = [];

    if (t.type === TournamentType.ROUND_ROBIN) {
      const poolSize = t.poolSize || 4;
      const numPools = Math.ceil(players.length / poolSize);
      const pools: string[][] = Array.from({ length: numPools }, () => []);
      
      players.forEach((p, i) => {
        pools[i % numPools].push(p);
      });

      pools.forEach((poolPlayers, poolIndex) => {
        const poolId = `Pool ${String.fromCharCode(65 + poolIndex)}`;
        for (let i = 0; i < poolPlayers.length; i++) {
          for (let j = i + 1; j < poolPlayers.length; j++) {
            newMatches.push({
              id: Math.random().toString(36).substr(2, 9),
              tournamentId: t.id,
              poolId: poolId,
              playerALogin: poolPlayers[i],
              playerBLogin: poolPlayers[j],
              scores: [],
              status: MatchStatus.SCHEDULED,
            });
          }
        }
      });
    } else {
        // Simple Single Elimination Seed
        for(let i=0; i<players.length; i+=2) {
             if (i+1 < players.length) {
                 newMatches.push({
                    id: Math.random().toString(36).substr(2, 9),
                    tournamentId: t.id,
                    round: 1,
                    playerALogin: players[i],
                    playerBLogin: players[i+1],
                    scores: [],
                    status: MatchStatus.SCHEDULED
                 })
             }
        }
    }

    t.status = 'Active';
    tournaments[tIndex] = t;
    this.write(KEYS.TOURNAMENTS, tournaments);
    
    this.write(KEYS.MATCHES, [...allMatches, ...newMatches]);
    
    // Initial Standings calculation
    let standings = this.read<PoolStandings[]>(KEYS.STANDINGS, []);
    // Clear old standings for this tournament
    standings = standings.filter(s => s.tournamentId !== tournamentId);
    // Recalc based on 0 matches (initializes rows)
    // We can just rely on lazy load or do it here. 
    // Doing it here ensures the table is populated.
    const uniquePools = Array.from(new Set(newMatches.map(m => m.poolId).filter(Boolean) as string[]));
    uniquePools.forEach(pid => {
       standings = this.recalculatePoolStandings(standings, newMatches, t.id, pid);
    });
    this.write(KEYS.STANDINGS, standings);
    
    this.logAudit(actor, 'UPDATE', 'TOURNAMENT', tournamentId, 'Generated schedule');
  }

  // --- Audit ---

  private logAudit(actor: string, action: AuditLog['action'], targetType: AuditLog['targetType'], targetId: string, details: string) {
    const logs = this.read<AuditLog[]>(KEYS.AUDIT, []);
    logs.push({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      actorLogin: actor,
      action,
      targetType,
      targetId,
      details
    });
    this.write(KEYS.AUDIT, logs);
  }
}

export const db = new StorageService();
