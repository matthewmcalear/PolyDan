import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useMarkets } from '../hooks/useMarkets';
import { useBets } from '../hooks/useBets';
import { Market, Bet } from '../types';
import { supabase } from '../lib/supabase';
import { formatProbability, formatDecimalOdds } from '../utils/odds';

const Bets: React.FC = () => {
  const { user } = useAuth();
  const { markets, isLoading: marketsLoading, error: marketsError, mutate: mutateMarkets } = useMarkets();
  const { bets, isLoading: betsLoading, error: betsError, mutate: mutateBets } = useBets();
  const userBets = user ? bets.filter((b: Bet) => b.user_id === user.id) : [];

  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const error = marketsError || betsError;
  const loading = marketsLoading || betsLoading;

  const openMarkets = markets.filter((m: Market) => m.status === 'open');
  const selectedMarketData = openMarkets.find((m: Market) => m.id === selectedMarket);

  // Calculate simple share price (simplified for now)
  const getSharePrice = (): number => {
    if (!selectedMarketData || !selectedOutcome) return 1;
    
    // Simple equal probability share price for now
    const numOutcomes = selectedMarketData.outcomes.length;
    return 1 / numOutcomes;
  };

  const placeBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMarket || !selectedOutcome || betAmount <= 0) return;

    setIsSubmitting(true);

    try {
      // Check if user has enough points
      if (user.points < betAmount) {
        toast.error('Insufficient fake dollars!');
        return;
      }

      if (!selectedMarketData) {
        toast.error('Invalid market selection');
        return;
      }

      if (selectedMarketData.status !== 'open') {
        toast.error('This market is not open for betting');
        return;
      }

      const sharePrice = getSharePrice();
      const shares = betAmount / sharePrice;

      // Create the bet
      const { error: betError } = await supabase
        .from('bets')
        .insert([{
          user_id: user.id,
          market_id: selectedMarket,
          outcome: selectedOutcome,
          points: betAmount,
          share_price: sharePrice,
          shares: shares,
        }]);

      if (betError) throw betError;

      // Update user's points
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ points: user.points - betAmount })
        .eq('user_id', user.id);

      if (pointsError) throw pointsError;

      toast.success('Bet placed successfully!');
      
      // Refresh data
      await mutateBets();
      await mutateMarkets();
      
      // Force reload user data
      window.location.reload();
      
      setBetAmount(0);
      setSelectedMarket('');
      setSelectedOutcome('');
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
              <label htmlFor="market" className="block text-sm font-medium text-gray-700">
                Select Market
              </label>
              <select
                id="market"
                value={selectedMarket}
                onChange={(e) => {
                  setSelectedMarket(e.target.value);
                  setSelectedOutcome('');
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3"
                required
              >
                <option value="">Select a market</option>
                {openMarkets.map((market: Market) => (
                  <option key={market.id} value={market.id}>
                    {market.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedMarket && selectedMarketData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Outcome
                </label>
                <div className="space-y-2">
                  {selectedMarketData.outcomes.map((outcome: string) => (
                    <label key={outcome} className="flex items-center p-4 min-h-[44px] border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="radio"
                        checked={selectedOutcome === outcome}
                        onChange={() => setSelectedOutcome(outcome)}
                        className="form-radio h-5 w-5 text-indigo-600"
                      />
                      <span className="ml-3 text-base font-semibold">{outcome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Bet Amount (Fake $)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-base">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full pl-9 pr-4 py-3 text-base rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0"
                  required
                  min="1"
                  max={user?.points || 0}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Available: ${user?.points || 0}
              </p>
            </div>

            {selectedMarket && selectedOutcome && betAmount > 0 && (
              <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bet Amount:</span>
                    <span className="font-semibold text-gray-900">${betAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Share Price:</span>
                    <span className="font-semibold text-indigo-600">${getSharePrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Shares:</span>
                    <span className="font-semibold text-indigo-600">{(betAmount / getSharePrice()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-indigo-200">
                    <span className="font-medium text-gray-900">Outcome:</span>
                    <span className="font-bold text-green-600">{selectedOutcome}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-indigo-600 py-3 px-4 min-h-[44px] text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              disabled={!selectedMarket || !selectedOutcome || betAmount <= 0 || !user || betAmount > user.points || isSubmitting}
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
                const market = markets.find((m: Market) => m.id === bet.market_id);
                const isResolved = market?.status === 'resolved';
                const isWinner = isResolved && market?.result === bet.outcome;
                
                return (
                  <div
                    key={bet.id}
                    className={`p-4 border rounded-lg ${
                      isResolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {market?.title || 'Unknown Market'}
                          </span>
                          {isResolved && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isWinner ? 'Won' : 'Lost'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="text-indigo-600 font-medium">{bet.outcome}</span>
                          {' '} • ${bet.points} ({bet.shares.toFixed(2)} shares @ ${bet.share_price.toFixed(2)})
                        </div>
                        {bet.payout && (
                          <div className="mt-1 text-sm font-semibold text-green-600">
                            Payout: ${bet.payout.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isResolved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Active
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