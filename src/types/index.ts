export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Champion {
  id: string;
  name: string;
  isEliminated: boolean;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bet {
  id: string;
  userId: string;
  championId: string;
  amount: number;
  odds: number;
  isFor: boolean; // true if betting for the champion to win, false if against
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
  payout?: number;
}

export interface SideBet {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
  options: SideBetOption[];
}

export interface SideBetOption {
  id: string;
  sideBetId: string;
  description: string;
  isCorrect: boolean;
}

export interface SideBetWager {
  id: string;
  userId: string;
  sideBetId: string;
  optionId: string;
  amount: number;
  odds: number;
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
  payout?: number;
} 