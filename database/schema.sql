-- Core schema for PolyDan v2.0
-- Run this inside Supabase or Heroku Postgres

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_update_timestamp ON users;
DROP TRIGGER IF EXISTS trg_update_timestamp_champions ON champions;
DROP TRIGGER IF EXISTS trg_update_timestamp_bets ON bets;
DROP TRIGGER IF EXISTS trg_update_timestamp_side_bets ON side_bets;

-- USERS ---------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'user', -- 'user' | 'admin'
  points numeric not null default 0,
  is_super boolean not null default false,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CHAMPIONS -----------------------------------------------------
create table if not exists champions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_eliminated boolean not null default false,
  is_winner boolean not null default false,
  has_redemption_chance boolean not null default false,
  is_redeemed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BETS ----------------------------------------------------------
create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  champion_id uuid references champions(id) on delete cascade,
  amount numeric not null check (amount > 0),
  odds numeric not null check (odds > 0),
  is_for boolean not null, -- true = "Yes", false = "No"
  is_resolved boolean not null default false,
  payout numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- SIDE BETS -----------------------------------------------------
create table if not exists side_bets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references users(id) on delete set null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists side_bet_options (
  id uuid primary key default gen_random_uuid(),
  side_bet_id uuid references side_bets(id) on delete cascade,
  description text not null,
  is_correct boolean not null default false
);

create table if not exists side_bet_wagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  side_bet_id uuid references side_bets(id) on delete cascade,
  option_id uuid references side_bet_options(id) on delete cascade,
  amount numeric not null check (amount > 0),
  odds numeric not null,
  is_resolved boolean not null default false,
  payout numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- TRANSACTIONS --------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  amount numeric not null, -- positive = credit, negative = debit
  reason text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- IOUS ----------------------------------------------------------
create table if not exists ious (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users(id) on delete cascade,
  to_user_id uuid references users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  description text,
  is_settled boolean not null default false,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- REDEMPTION ISLAND --------------------------------------------
create table if not exists redemption_challenges (
  id uuid primary key default gen_random_uuid(),
  champion_id uuid references champions(id) on delete cascade,
  round integer not null,
  is_won boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- TRIGGERS ------------------------------------------------------
-- Keep updated_at current
create or replace function update_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_update_timestamp
before update on users
for each row execute procedure update_timestamp();

create trigger trg_update_timestamp_champions
before update on champions
for each row execute procedure update_timestamp();

create trigger trg_update_timestamp_bets
before update on bets
for each row execute procedure update_timestamp();

create trigger trg_update_timestamp_side_bets
before update on side_bets
for each row execute procedure update_timestamp();

-- Indexes for quicker lookups ----------------------------------
create index if not exists idx_bets_user on bets(user_id);
create index if not exists idx_bets_champion on bets(champion_id);
create index if not exists idx_ious_from on ious(from_user_id);
create index if not exists idx_ious_to on ious(to_user_id); 