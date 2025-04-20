import React from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { User, SideBet } from '../types';

/* ---------------------------------- LEADERBOARD ---------------------------------- */

const fetchLeaderboard = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, points, role')
    .order('points', { ascending: false });

  if (error) throw error;
  return (
    data?.map((u) => ({
      ...u,
      created_at: new Date(),
      updated_at: new Date(),
      email: '',
      is_super: false,
      is_anonymous: false,
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left" aria-label="Leaderboard table">
        <thead className="border-b text-gray-700">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              Rank
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Name
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p: User, idx: number) => (
            <tr key={p.id} className={idx % 2 ? 'bg-gray-50' : ''}>
              <td className="py-2 pr-4">{idx + 1}</td>
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4 text-right font-semibold">{p.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ---------------------------------- SIDE BETS ---------------------------------- */

const fetchSideBets = async (): Promise<SideBet[]> => {
  const { data, error } = await supabase
    .from('side_bets')
    .select('id, title, description, is_resolved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (
    data?.map((sb) => ({
      ...sb,
      createdBy: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: undefined,
      options: [],
    })) as unknown as SideBet[]
  );
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
  <div className="bg-white p-6 rounded-lg shadow">
    <h1 className="text-xl font-semibold mb-4">Pool Rules</h1>
    <p>Detailed rules and scoring info will be here.</p>
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