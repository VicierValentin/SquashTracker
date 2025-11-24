export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
}

export interface User {
  login: string; // Unique ID
  displayName: string;
  fullName?: string;
  avatarUrl?: string;
  club?: string;
  ranking?: number;
  handedness?: 'Left' | 'Right';
  preferredCourt?: string;
  role: UserRole;
  createdAt: string;
}

export enum TournamentType {
  ROUND_ROBIN = 'ROUND_ROBIN',
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
}

export interface ScoringRules {
  pointsPerGame: number;
  bestOf: 3 | 5;
  mustWinByTwo: boolean;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  startDate: string;
  type: TournamentType;
  status: 'Draft' | 'Active' | 'Completed';
  poolSize: number;
  rules: ScoringRules;
  participants: string[]; // List of user logins
  adminLogin: string;
}

export interface GameScore {
  playerAScore: number;
  playerBScore: number;
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface Match {
  id: string;
  tournamentId: string;
  poolId?: string; // If round robin
  round?: number; // If elimination
  playerALogin: string;
  playerBLogin: string;
  scores: GameScore[];
  status: MatchStatus;
  winnerLogin?: string;
  court?: string;
  scheduledTime?: string;
  completedAt?: string;
}

export interface PoolStandings {
  login: string;
  tournamentId: string;
  poolId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  pointsWon: number;
  pointsLost: number;
  pointsDiff: number;
  lastPlayedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorLogin: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  targetType: 'MATCH' | 'TOURNAMENT' | 'USER';
  targetId: string;
  details: string;
}
