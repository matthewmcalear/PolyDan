-- LIVE SCHEMA DOCUMENTATION for PolyDan
-- This documents the actual live Lovable Supabase schema (sgumgwxcntdefrocpuoh)
-- DO NOT apply this file - it describes existing production tables

-- NOTE: The tables below already exist in production.
-- The original schema.sql (users, champions, side_bets, transactions, ious) was NEVER applied.
-- This file is for documentation purposes only.

-- PROFILES (User/Profile Table) --------------------------------
-- This is the main user table. Auth user IDs are stored in user_id.
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique, -- References auth.users.id
  email text not null,
  display_name text not null, -- Shown as "name" in the UI
  photo_url text,
  points numeric not null default 1000,
  role text not null default 'user', -- 'admin' | 'user'
  is_eliminated boolean not null default false,
  on_redemption_island boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MARKETS (Prediction Markets) ---------------------------------
-- Stores all markets including the champion "Who will win?" market
create table if not exists markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  outcomes text[] not null, -- Array of outcome strings (e.g., player names)
  status text not null default 'open', -- 'open' | 'resolved' | 'cancelled'
  result text, -- Winning outcome when resolved
  is_champion boolean not null default false, -- True for the main "Who wins?" market
  champion_player_id uuid, -- Optional link to a profile
  created_by uuid, -- Profile user_id
  resolved_by uuid, -- Profile user_id
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  outcome_prices jsonb, -- Optional pricing data
  market_type text not null default 'multi' -- 'multi' | 'binary'
);

-- BETS (Share-based bets) --------------------------------------
-- Bets are share-based: users buy shares of outcomes at a share_price
create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- Auth user ID (profiles.user_id)
  market_id uuid not null, -- References markets.id
  outcome text not null, -- The outcome being bet on
  points numeric not null check (points > 0), -- Amount of points spent
  share_price numeric not null check (share_price > 0),
  shares numeric not null check (shares > 0),
  payout numeric, -- Set when market resolves
  created_at timestamptz not null default now()
);

-- GAMES (Empty in production, RLS-protected) ------------------
-- Exists but not currently used
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- INDEXES -------------------------------------------------------
create index if not exists idx_bets_user on bets(user_id);
create index if not exists idx_bets_market on bets(market_id);
create index if not exists idx_profiles_user on profiles(user_id);
create index if not exists idx_markets_status on markets(status);

-- NOTES ---------------------------------------------------------
-- Tables that DO NOT exist in production:
--   - users (replaced by profiles)
--   - champions (replaced by markets)
--   - side_bets, side_bet_options, side_bet_wagers
--   - transactions
--   - ious
--   - competitions
--   - redemption_challenges
--   - admin_users
--
-- Key mappings:
--   - User.id in code = profiles.user_id (the auth user ID)
--   - Champion/player names are stored in markets.outcomes[]
--   - The champion market has is_champion = true
--   - Bets are share-based with outcome, shares, share_price 