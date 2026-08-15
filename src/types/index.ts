export type UserRole = 'admin' | 'commissioner' | 'player';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  points: number;
  role: UserRole;
  is_eliminated: boolean;
  on_redemption_island: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  outcomes: string[];
  status: 'open' | 'resolved' | 'cancelled';
  result: string | null;
  is_champion: boolean;
  champion_player_id: string | null;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  outcome_prices: Record<string, number> | null;
  market_type: 'multi' | 'binary';
}

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  outcome: string;
  points: number;
  share_price: number;
  shares: number;
  payout: number | null;
  created_at: Date;
}

// Side bets, wagers, transactions, and IOUs don't exist in live schema
// Keeping minimal interfaces for compatibility with existing code that references them

export interface SideBet {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
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