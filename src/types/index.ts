export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
  created_at: Date;
  updated_at: Date;
  is_super: boolean;
  is_anonymous: boolean;
}

export interface Champion {
  id: string;
  name: string;
  isEliminated: boolean;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasRedemptionChance?: boolean;
  isRedeemed?: boolean;
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

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

export interface IOU {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  description?: string;
  createdAt: Date;
  settledAt?: Date;
  isSettled: boolean;
}

export interface RedemptionChallenge {
  id: string;
  championId: string;
  round: number;
  isWon: boolean;
  createdAt: Date;
  resolvedAt?: Date;
} 