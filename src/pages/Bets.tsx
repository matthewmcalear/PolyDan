import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useChampions } from '../hooks/useChampions';
import { useBets } from '../hooks/useBets';
import { Champion, Bet } from '../types';
import { supabase } from '../lib/supabase';
import { calculatePoolOdds, getChampionOdds, formatProbability, formatDecimalOdds, calculatePayout } from '../utils/odds';

const Bets: React.FC = () => {
  const { user } = useAuth();
  const { champions, isLoading: championsLoading, error: championsError, mutate: mutateChampions } = useChampions();
  const { bets, isLoading: betsLoading, error: betsError, mutate: mutateBets } = useBets();
  const userBets = bets.filter((b: Bet) => b.userId === user?.id);

  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedChampion, setSelectedChampion] = useState<string>('');
  const [isBettingFor, setIsBettingFor] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const error = championsError || betsError;
  const loading = championsLoading || betsLoading;

  const activeChampions = champions.filter((c: Champion) => !c.isEliminated);
  const activeChampionIds = activeChampions.map((c: Champion) => c.id);

  // Calculate current pool-based odds
  const poolStats = calculatePoolOdds(
    bets.map((b: Bet) => ({ championId: b.championId, amount: b.amount, isFor: b.isFor })),
    activeChampionIds
  );

  const getOddsForSelectedChampion = (): number => {
    if (!selectedChampion) return 0;
    const selectedChamp = champions.find((c: Champion) => c.id === selectedChampion);
    if (!selectedChamp || selectedChamp.isEliminated) return 0;
    
    if (isBettingFor) {
      // For "For" bets, use pool odds
      const odds = getChampionOdds(selectedChampion, bets.map((b: Bet) => ({ championId: b.championId, amount: b.amount, isFor: b.isFor })), activeChampionIds);
      return odds.decimalOdds;
    } else {
      // For "Against" bets, simplified odds (not part of pool)
      // In a simple implementation, "Against" bets pay even money if the champion doesn't win
      return 2.0;
    }
  };

  const placeBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChampion || betAmount <= 0) return;

    setIsSubmitting(true);

    try {
      // Check if user has enough points
      if (user.points < betAmount) {
        toast.error('Insufficient fake dollars!');
        return;
      }

      const selectedChamp = champions.find((c: Champion) => c.id === selectedChampion);
      if (!selectedChamp) {
        toast.error('Invalid champion selection');
        return;
      }

      if (selectedChamp.isEliminated) {
        toast.error('Cannot bet on eliminated champions');
        return;
      }

      const odds = getOddsForSelectedChampion();
      if (odds === 0) {
        toast.error('Unable to calculate odds');
        return;
      }

      // Create the bet
      const { error: betError } = await supabase
        .from('bets')
        .insert([{
          user_id: user.id,
          champion_id: selectedChampion,
          amount: betAmount,
          odds: odds,
          is_for: isBettingFor,
        }]);

      if (betError) throw betError;

      // Update user's points
      const { error: pointsError } = await supabase
        .from('users')
        .update({ points: user.points - betAmount })
        .eq('id', user.id);

      if (pointsError) throw pointsError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          amount: -betAmount,
          reason: `Bet ${isBettingFor ? 'for' : 'against'} ${selectedChamp.name}`,
          meta: {
            bet_type: isBettingFor ? 'for' : 'against',
            champion_id: selectedChampion,
            champion_name: selectedChamp.name,
            odds: odds,
          },
        }]);

      if (txError) throw txError;

      toast.success('Bet placed successfully!');
      
      // Refresh data
      await mutateBets();
      await mutateChampions();
      
      // Force reload user data
      window.location.reload();
      
      setBetAmount(0);
      setSelectedChampion('');
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-100">Your Balance</p>
            <p className="text-3xl font-bold">${user?.points || 0}</p>
            <p className="text-xs text-indigo-200 mt-1">fake dollars</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-indigo-100">Active Bets</p>
            <p className="text-2xl font-bold">{userBets.filter((b: Bet) => !b.isResolved).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Place a Bet
          </h3>
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{(error as any)?.message ?? error?.toString()}</div>
            </div>
          )}

          <form onSubmit={placeBet} className="mt-5 space-y-4">
            <div>
              <label htmlFor="champion" className="block text-sm font-medium text-gray-700">
                Select Champion
              </label>
              <select
                id="champion"
                value={selectedChampion}
                onChange={(e) => setSelectedChampion(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a champion</option>
                {activeChampions.map((champion: Champion) => {
                  const stats = poolStats.get(champion.id);
                  const prob = stats?.impliedProbability || 0;
                  const odds = stats?.decimalOdds || 0;
                  return (
                    <option key={champion.id} value={champion.id}>
                      {champion.name} - {formatProbability(prob)} ({formatDecimalOdds(odds)}x)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bet Type
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={isBettingFor}
                    onChange={() => setIsBettingFor(true)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-3">
                    <span className="font-medium">For</span> - Bet this champion will win
                  </span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={!isBettingFor}
                    onChange={() => setIsBettingFor(false)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-3">
                    <span className="font-medium">Against</span> - Bet this champion won't win
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Bet Amount (Fake $)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="0"
                  required
                  min="1"
                  max={user?.points || 0}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Available: ${user?.points || 0}
              </p>
            </div>

            {selectedChampion && betAmount > 0 && (
              <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bet Amount:</span>
                    <span className="font-semibold text-gray-900">${betAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Odds:</span>
                    <span className="font-semibold text-indigo-600">{formatDecimalOdds(getOddsForSelectedChampion())}x</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-indigo-200">
                    <span className="font-medium text-gray-900">Potential Payout:</span>
                    <span className="font-bold text-green-600">${calculatePayout(betAmount, getOddsForSelectedChampion()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Profit if you win:</span>
                    <span className="text-green-600">+${(calculatePayout(betAmount, getOddsForSelectedChampion()) - betAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedChampion || betAmount <= 0 || !user || betAmount > user.points || isSubmitting}
            >
              {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Your Bets
          </h3>
          
          {userBets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">You haven't placed any bets yet.</p>
          ) : (
            <div className="space-y-3">
              {userBets.map((bet: Bet) => {
                const champion = champions.find((c: Champion) => c.id === bet.championId);
                const isActive = !bet.isResolved;
                const championEliminated = champion?.isEliminated;
                
                return (
                  <div
                    key={bet.id}
                    className={`p-4 border rounded-lg ${
                      !isActive ? 'bg-gray-50 border-gray-200' : 
                      championEliminated ? 'bg-red-50 border-red-200' :
                      'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {champion?.name || 'Unknown'}
                          </span>
                          {championEliminated && isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Eliminated
                            </span>
                          )}
                          {champion?.isWinner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className={bet.isFor ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {bet.isFor ? 'For' : 'Against'}
                          </span>
                          {' '} • ${bet.amount} @ {formatDecimalOdds(bet.odds)}x odds
                        </div>
                        {isActive && (
                          <div className="mt-1 text-xs text-gray-500">
                            Potential payout: ${calculatePayout(bet.amount, bet.odds).toFixed(2)}
                          </div>
                        )}
                        {!isActive && bet.payout && (
                          <div className="mt-1 text-sm font-semibold text-green-600">
                            Payout: ${bet.payout.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bets; 