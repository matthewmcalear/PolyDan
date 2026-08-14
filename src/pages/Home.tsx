import React from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { useAuth } from '../context/AuthContext';
import { useChampions } from '../hooks/useChampions';
import { useBets } from '../hooks/useBets';
import { supabase } from '../lib/supabase';
import { User, Champion, Bet } from '../types';
import { calculatePoolOdds, formatProbability, formatDecimalOdds } from '../utils/odds';

const fetchLeaderboard = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, points, email, role, created_at, updated_at, is_super, is_anonymous')
    .order('points', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data || []).map((u) => ({
    ...u,
    created_at: new Date(u.created_at),
    updated_at: new Date(u.updated_at),
  })) as User[];
};

const Home: React.FC = () => {
  const { user } = useAuth();
  const { champions, isLoading: championsLoading } = useChampions();
  const { bets, isLoading: betsLoading } = useBets();
  const { data: leaderboard, isLoading: leaderboardLoading } = useSWR('leaderboard-home', fetchLeaderboard);

  const activeChampions = champions.filter((c: Champion) => !c.isEliminated);
  const activeChampionIds = activeChampions.map((c: Champion) => c.id);
  
  // Calculate pool-based odds for all active champions
  const poolStats = calculatePoolOdds(
    bets.map((b: Bet) => ({ championId: b.championId, amount: b.amount, isFor: b.isFor })),
    activeChampionIds
  );

  // Sort champions by implied probability (favorites first)
  const sortedChampions = [...activeChampions].sort((a, b) => {
    const aProb = poolStats.get(a.id)?.impliedProbability || 0;
    const bProb = poolStats.get(b.id)?.impliedProbability || 0;
    return bProb - aProb;
  });

  const loading = championsLoading || betsLoading || leaderboardLoading;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <header className="bg-indigo-600 rounded-lg text-white p-4 sm:p-8 shadow">
        <h1 className="text-2xl sm:text-3xl font-extrabold">PolyDan Iron Man Betting</h1>
        <p className="mt-2 text-sm sm:text-base text-indigo-100 max-w-2xl">
          Family-friendly, last-man-standing prediction market. Bet fake dollars on who wins the Iron Man competition!
        </p>
        {user && (
          <div className="mt-3 text-lg font-semibold text-white">
            Your Balance: <span className="text-yellow-300">${user.points}</span> fake dollars
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {user ? (
            <Link
              to="/bets"
              className="inline-flex items-center px-5 py-2.5 rounded-md bg-yellow-400 hover:bg-yellow-300 text-indigo-900 text-sm font-bold transition"
            >
              Place Your Bet
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-flex items-center px-5 py-2.5 rounded-md bg-yellow-400 hover:bg-yellow-300 text-indigo-900 text-sm font-bold transition"
            >
              Join the Competition
            </Link>
          )}
          <Link
            to="/rules"
            className="inline-flex items-center px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium transition"
          >
            How It Works
          </Link>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Who Wins Market */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Who Wins? <span className="text-sm font-normal text-gray-500">(Last Man Standing)</span>
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : activeChampions.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No active champions yet. Check back soon!</p>
          ) : (
            <div className="space-y-3">
              {sortedChampions.map((champion) => {
                const stats = poolStats.get(champion.id);
                const probability = stats?.impliedProbability || 0;
                const odds = stats?.decimalOdds || 0;
                
                return (
                  <div
                    key={champion.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{champion.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatProbability(probability)} chance
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-600 text-lg">
                        {formatDecimalOdds(odds)}x
                      </div>
                      <div className="text-xs text-gray-500">odds</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeChampions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                <strong>{activeChampions.length}</strong> champions remain in the competition
              </p>
              {user && (
                <Link
                  to="/bets"
                  className="block w-full text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition"
                >
                  Place a Bet
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
            <Link to="/leaderboard" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View All →
            </Link>
          </div>

          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No players yet. Be the first to join!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((player: User, idx: number) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
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
                      <div className="font-semibold text-gray-900">{player.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">${player.points}</div>
                    <div className="text-xs text-gray-500">fake $</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/side-bets" className="card hover:scale-[1.02] transition-transform">
          <h2 className="card-title">Side Bets</h2>
          <p className="card-body">Create or join fun side wagers outside the main market.</p>
        </Link>

        <Link to="/rules" className="card hover:scale-[1.02] transition-transform">
          <h2 className="card-title">How It Works</h2>
          <p className="card-body">Learn about fake dollars, odds, payouts, and market rules.</p>
        </Link>

        <Link to="/faq" className="card hover:scale-[1.02] transition-transform">
          <h2 className="card-title">Help & FAQ</h2>
          <p className="card-body">Common questions about the Iron Man betting competition.</p>
        </Link>
      </div>
    </div>
  );
};

export default Home; 