import React from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { useAuth } from '../context/AuthContext';
import { useMarkets } from '../hooks/useMarkets';
import { useBets } from '../hooks/useBets';
import { supabase } from '../lib/supabase';
import { User, Market, Bet } from '../types';
import { calculatePoolOdds, formatProbability, formatDecimalOdds } from '../utils/odds';

const fetchLeaderboard = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, points, email, role, created_at, updated_at')
    .order('points', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data || []).map((u) => ({
    id: u.user_id,
    name: u.display_name,
    email: u.email,
    role: u.role,
    points: Number(u.points),
    created_at: new Date(u.created_at),
    updated_at: new Date(u.updated_at),
  })) as User[];
};

const Home: React.FC = () => {
  const { user } = useAuth();
  const { markets, isLoading: marketsLoading } = useMarkets({ championOnly: true });
  const { bets, isLoading: betsLoading } = useBets();
  const { data: leaderboard, isLoading: leaderboardLoading } = useSWR('leaderboard-home', fetchLeaderboard);

  // Get the champion market (the "Who wins?" market)
  const championMarket = markets.find((m: Market) => m.is_champion && m.status === 'open');
  const outcomes = championMarket?.outcomes || [];
  
  // Calculate simple pool stats per outcome
  const outcomeStats = outcomes.map(outcome => {
    const outcomeBets = championMarket 
      ? bets.filter((b: Bet) => b.market_id === championMarket.id && b.outcome === outcome)
      : [];
    const totalPoints = outcomeBets.reduce((sum, b) => sum + b.points, 0);
    return { outcome, totalPoints };
  });

  // Sort by total points (most popular first)
  const sortedOutcomes = [...outcomeStats].sort((a, b) => b.totalPoints - a.totalPoints);

  const loading = marketsLoading || betsLoading || leaderboardLoading;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <header className="bg-indigo-600 rounded-lg text-white p-4 sm:p-6 shadow">
        <h1 className="text-xl sm:text-3xl font-extrabold">PolyDan Iron Man Betting</h1>
        <p className="mt-2 text-sm sm:text-base text-indigo-100">
          Family-friendly, last-man-standing prediction market. Bet fake dollars on who wins the Iron Man competition!
        </p>
        {user && (
          <div className="mt-3 text-base sm:text-lg font-semibold text-white">
            Your Balance: <span className="text-yellow-300">${user.points}</span> fake dollars
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {user ? (
            <Link
              to="/bets"
              className="inline-flex items-center justify-center px-5 py-3 min-h-[44px] rounded-lg bg-yellow-400 hover:bg-yellow-300 text-indigo-900 text-base font-bold transition"
            >
              Place Your Bet
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-5 py-3 min-h-[44px] rounded-lg bg-yellow-400 hover:bg-yellow-300 text-indigo-900 text-base font-bold transition"
            >
              Join the Competition
            </Link>
          )}
          <Link
            to="/rules"
            className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 text-base font-medium transition"
          >
            How It Works
          </Link>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Who Wins Market */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Who Wins? <span className="text-sm font-normal text-gray-500">(Last Man Standing)</span>
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : !championMarket || outcomes.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No active champion market yet. Check back soon!</p>
          ) : (
            <div className="space-y-3">
              {sortedOutcomes.map(({ outcome, totalPoints }) => {
                const totalPool = outcomeStats.reduce((sum, s) => sum + s.totalPoints, 0);
                const probability = totalPool > 0 ? totalPoints / totalPool : 1 / outcomes.length;
                const odds = probability > 0 ? 1 / probability : 0;
                
                return (
                  <div
                    key={outcome}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{outcome}</div>
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

          {championMarket && outcomes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                <strong>{outcomes.length}</strong> players remain in the competition
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
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
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