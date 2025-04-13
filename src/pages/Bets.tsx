import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Champion, Bet } from '../types';
import { useAuth } from '../context/AuthContext';

const Bets: React.FC = () => {
  const { user } = useAuth();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedChampion, setSelectedChampion] = useState<string>('');
  const [isBettingFor, setIsBettingFor] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch champions
      const { data: championsData, error: championsError } = await supabase
        .from('champions')
        .select('*')
        .order('name');

      if (championsError) throw championsError;
      setChampions(championsData || []);

      // Fetch user's bets
      if (user) {
        const { data: betsData, error: betsError } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (betsError) throw betsError;
        setUserBets(betsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateOdds = (champion: Champion, isFor: boolean): number => {
    // Simple odds calculation - can be made more sophisticated
    if (champion.isEliminated) return 0;
    if (champion.isWinner) return isFor ? 1 : 0;
    
    // Base odds - can be adjusted based on various factors
    return isFor ? 2.5 : 1.5;
  };

  const placeBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChampion || betAmount <= 0) return;

    try {
      // First check if user has enough points
      if (user.points < betAmount) {
        setError('Insufficient points');
        return;
      }

      const selectedChamp = champions.find(c => c.id === selectedChampion);
      if (!selectedChamp) {
        setError('Invalid champion selection');
        return;
      }

      const odds = calculateOdds(selectedChamp, isBettingFor);
      if (odds === 0) {
        setError('Cannot bet on eliminated champions');
        return;
      }

      // Create the bet
      const { error: betError } = await supabase
        .from('bets')
        .insert([
          {
            user_id: user.id,
            champion_id: selectedChampion,
            amount: betAmount,
            odds: odds,
            is_for: isBettingFor,
            is_resolved: false,
          },
        ]);

      if (betError) throw betError;

      // Update user's points
      const { error: pointsError } = await supabase
        .from('users')
        .update({ points: user.points - betAmount })
        .eq('id', user.id);

      if (pointsError) throw pointsError;

      // Refresh data
      await fetchData();
      setBetAmount(0);
      setSelectedChampion('');
    } catch (error) {
      console.error('Error placing bet:', error);
      setError('Failed to place bet');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Place a Bet
          </h3>
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
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
                {champions
                  .filter(c => !c.isEliminated)
                  .map(champion => (
                    <option key={champion.id} value={champion.id}>
                      {champion.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bet Type
              </label>
              <div className="mt-1 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isBettingFor}
                    onChange={() => setIsBettingFor(true)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2">For</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isBettingFor}
                    onChange={() => setIsBettingFor(false)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2">Against</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Bet Amount (Points)
              </label>
              <input
                type="number"
                id="amount"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
                min="1"
                max={user?.points || 0}
              />
            </div>

            {selectedChampion && betAmount > 0 && (
              <div className="rounded-md bg-gray-50 p-4">
                <div className="text-sm text-gray-700">
                  <p>Potential Payout: {(betAmount * (calculateOdds(champions.find(c => c.id === selectedChampion)!, isBettingFor))).toFixed(2)} points</p>
                  <p>Current Balance: {user?.points || 0} points</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={!selectedChampion || betAmount <= 0 || !user || betAmount > user.points}
            >
              Place Bet
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Your Active Bets
          </h3>
          
          <div className="mt-6">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Champion
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Odds
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Potential Payout
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {userBets
                    .filter(bet => !bet.isResolved)
                    .map((bet) => {
                      const champion = champions.find(c => c.id === bet.championId);
                      return (
                        <tr key={bet.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {champion?.name || 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {bet.amount} points
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {bet.isFor ? 'For' : 'Against'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {bet.odds}x
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {(bet.amount * bet.odds).toFixed(2)} points
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bets; 