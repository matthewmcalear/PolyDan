import React from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { User, SideBet } from '../types';

/* ---------------------------------- LEADERBOARD ---------------------------------- */

const fetchLeaderboard = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, points, role, email, created_at, updated_at')
    .order('points', { ascending: false });

  if (error) throw error;
  return (
    data?.map((p) => ({
      id: p.user_id,
      name: p.display_name,
      email: p.email,
      points: Number(p.points),
      role: p.role,
      created_at: new Date(p.created_at),
      updated_at: new Date(p.updated_at),
    })) as unknown as User[]
  );
};

export const Leaderboard: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow" aria-labelledby="leaderboard-heading">
    <h1 id="leaderboard-heading" className="text-xl font-semibold mb-4">
      Leaderboard
    </h1>
    <LeaderboardTable />
  </div>
);

const LeaderboardTable: React.FC = () => {
  const { data: players, error, isLoading } = useSWR('leaderboard', fetchLeaderboard);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error loading leaderboard.</p>;
  }

  if (!players?.length) {
    return <p className="text-sm text-gray-500">No players yet.</p>;
  }

  return (
    <div className="space-y-2">
      {players.map((p: User, idx: number) => (
        <div
          key={p.id}
          className={`flex items-center justify-between p-4 rounded-lg ${
            idx === 0
              ? 'bg-yellow-50 border-2 border-yellow-300'
              : idx === 1
              ? 'bg-gray-100 border border-gray-300'
              : idx === 2
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                idx === 0
                  ? 'bg-yellow-400 text-yellow-900'
                  : idx === 1
                  ? 'bg-gray-300 text-gray-700'
                  : idx === 2
                  ? 'bg-orange-300 text-orange-900'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {idx + 1}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{p.name}</div>
              {p.role === 'admin' && (
                <span className="text-xs text-gray-500">Admin</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-indigo-600 text-lg">${p.points}</div>
            <div className="text-xs text-gray-500">fake $</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------- SIDE BETS ---------------------------------- */

const fetchSideBets = async (): Promise<SideBet[]> => {
  // Side bets table doesn't exist in live schema, return empty array
  // In the future, this could use markets with market_type != 'champion'
  return [];
};

export const SideBets: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow" aria-labelledby="sidebets-heading">
    <h1 id="sidebets-heading" className="text-xl font-semibold mb-4">
      Side Bets
    </h1>
    <SideBetList />
  </div>
);

const SideBetList: React.FC = () => {
  const { data: sideBets, error, isLoading } = useSWR('sidebets', fetchSideBets);

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Error loading side bets.</p>;
  if (!sideBets?.length) return <p className="text-sm text-gray-500">No side bets yet.</p>;

  return (
    <ul className="divide-y divide-gray-200">
      {sideBets.map((sb: SideBet) => (
        <li key={sb.id} className="py-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            {sb.title}{' '}
            {sb.isResolved && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Resolved
              </span>
            )}
          </h3>
          {sb.description && <p className="text-sm text-gray-600 mt-1">{sb.description}</p>}
        </li>
      ))}
    </ul>
  );
};

/* ---------------------------------- RULES ---------------------------------- */

export const Rules: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow max-w-4xl">
    <h1 className="text-2xl font-bold mb-6 text-gray-900">How PolyDan Works</h1>
    
    <div className="space-y-6 text-gray-700">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">The Game</h2>
        <p className="mb-2">
          PolyDan is a family-friendly, last-man-standing prediction market for an Iron Man competition. 
          You bet <strong>fake dollars</strong> (not real money) on who you think will win.
        </p>
        <p>
          Everyone starts with <strong>$1,000 fake dollars</strong>. The goal is to grow your balance by making smart bets!
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How Betting Works</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>For Bets:</strong> You bet that a specific champion will win the whole competition. 
            If they win, you get paid based on the odds at the time you placed your bet.
          </li>
          <li>
            <strong>Against Bets:</strong> You bet that a specific champion will NOT win. 
            If anyone else wins, you get paid at 2x odds (simplified).
          </li>
          <li>
            You can only bet on champions who are still in the competition (not eliminated).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How Odds Work (Parimutuel Pool)</h2>
        <p className="mb-2">
          Odds are determined by the <strong>pool of all bets</strong>, not by the house. This is called parimutuel betting.
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            The more money bet on a champion, the lower their odds (they become the "favorite").
          </li>
          <li>
            Champions with fewer bets have higher odds (they're the "underdogs").
          </li>
          <li>
            <strong>Implied Probability:</strong> This is the market's estimate of a champion's chance to win, 
            calculated as: (money on that champion) / (total money in pool).
          </li>
          <li>
            <strong>Decimal Odds:</strong> This tells you your total payout per dollar bet. 
            For example, 3.00x odds means you get $3 back for every $1 wagered (including your original stake).
          </li>
          <li>
            If nobody has bet yet, all champions start with even odds.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">What Happens When Champions Get Eliminated?</h2>
        <p className="mb-2">
          <strong>Elimination Rule:</strong> Bets on eliminated champions stay in place until the market resolves. 
          No refunds are given for betting on eliminated champions.
        </p>
        <p>
          This means if you bet on someone and they get eliminated, your bet stays active (but will lose when the market is resolved).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Market Resolution & Payouts</h2>
        <p className="mb-2">
          When the competition ends and a winner is crowned:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>For Bets on the Winner:</strong> You get paid according to the odds you locked in when you placed your bet. 
            Payout = (Your Bet Amount) × (Your Locked Odds).
          </li>
          <li>
            <strong>Against Bets on the Winner:</strong> You lose your stake.
          </li>
          <li>
            <strong>For Bets on Anyone Else:</strong> You lose your stake.
          </li>
          <li>
            <strong>Against Bets on Non-Winners:</strong> You win at 2x odds.
          </li>
        </ul>
        <p className="mt-2">
          All payouts are credited to your fake-dollar balance, and a transaction record is created for your records.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Leaderboard</h2>
        <p>
          The leaderboard tracks everyone's current fake-dollar balance. The person with the most fake dollars 
          at the end wins bragging rights!
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>This is for <strong>fake dollars only</strong>. No real money or crypto is involved.</li>
          <li>You cannot bet more than your current balance.</li>
          <li>Odds change in real-time as people place bets.</li>
          <li>Once a bet is placed, it cannot be canceled or modified.</li>
        </ul>
      </section>

      <section className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">Example</h2>
        <p className="text-sm text-gray-700">
          Say there are 3 champions remaining: Alice, Bob, and Charlie.
          <br />
          • $600 has been bet on Alice → 60% probability, 1.67x odds
          <br />
          • $300 has been bet on Bob → 30% probability, 3.33x odds
          <br />
          • $100 has been bet on Charlie → 10% probability, 10x odds
          <br /><br />
          If you bet $100 on Charlie and Charlie wins, you get: $100 × 10 = <strong>$1,000 payout</strong> (profit of $900).
        </p>
      </section>
    </div>
  </div>
);

/* ---------------------------------- PROFILE ---------------------------------- */

export const Profile: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h1 className="text-xl font-semibold mb-4">Your Profile</h1>
    <p>Profile editing will be added soon.</p>
  </div>
);

/* ---------------------------------- FAQ ---------------------------------- */

export const FAQ: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h1 className="text-xl font-semibold mb-4">Help & FAQ</h1>
    <p>Frequently asked questions will be listed here.</p>
  </div>
); 