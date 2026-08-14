import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Champion } from '../types';

const Admin: React.FC = () => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [newChampionName, setNewChampionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchChampions();
  }, []);

  const fetchChampions = async () => {
    try {
      const { data, error } = await supabase
        .from('champions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedChampions = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        isEliminated: d.is_eliminated,
        isWinner: d.is_winner,
        hasRedemptionChance: d.has_redemption_chance,
        isRedeemed: d.is_redeemed,
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at),
      }));
      
      setChampions(mappedChampions);
    } catch (error) {
      console.error('Error fetching champions:', error);
      setError('Failed to fetch champions');
    } finally {
      setLoading(false);
    }
  };

  const addChampion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChampionName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('champions')
        .insert([
          {
            name: newChampionName.trim(),
            is_eliminated: false,
            is_winner: false,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        await fetchChampions();
        setNewChampionName('');
        toast.success('Champion added successfully');
      }
    } catch (error) {
      console.error('Error adding champion:', error);
      toast.error('Failed to add champion');
    }
  };

  const toggleEliminationStatus = async (champion: Champion) => {
    try {
      const { error } = await supabase
        .from('champions')
        .update({
          is_eliminated: !champion.isEliminated,
          is_winner: false,
        })
        .eq('id', champion.id);

      if (error) throw error;
      
      await fetchChampions();
      toast.success(`${champion.name} ${!champion.isEliminated ? 'eliminated' : 'restored'}`);
    } catch (error) {
      console.error('Error updating champion status:', error);
      toast.error('Failed to update champion status');
    }
  };

  const setWinner = async (champion: Champion) => {
    if (!window.confirm(`Are you sure you want to crown ${champion.name} as the winner? This will resolve all bets and cannot be undone.`)) {
      return;
    }

    setIsResolving(true);

    try {
      // First, reset all champions' winner status
      const { error: resetError } = await supabase
        .from('champions')
        .update({ is_winner: false })
        .not('id', 'eq', champion.id);

      if (resetError) throw resetError;

      // Then set the selected champion as winner
      const { error } = await supabase
        .from('champions')
        .update({
          is_winner: true,
          is_eliminated: false,
        })
        .eq('id', champion.id);

      if (error) throw error;

      // Now resolve all bets
      await resolveMarket(champion.id);

      await fetchChampions();
      toast.success(`${champion.name} crowned as winner! All bets resolved.`);
    } catch (error) {
      console.error('Error setting winner:', error);
      toast.error('Failed to set winner');
    } finally {
      setIsResolving(false);
    }
  };

  const resolveMarket = async (winnerId: string) => {
    try {
      // Fetch all unresolved bets
      const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select('*')
        .eq('is_resolved', false);

      if (betsError) throw betsError;

      if (!bets || bets.length === 0) {
        console.log('No unresolved bets to process');
        return;
      }

      console.log(`Resolving ${bets.length} bets for winner ${winnerId}`);

      // Process each bet
      for (const bet of bets) {
        let payout = 0;
        let won = false;

        if (bet.is_for && bet.champion_id === winnerId) {
          // Bet FOR the winner - they win!
          payout = bet.amount * bet.odds;
          won = true;
        } else if (!bet.is_for && bet.champion_id !== winnerId) {
          // Bet AGAINST a non-winner - they win!
          payout = bet.amount * bet.odds;
          won = true;
        }
        // All other cases: lost bet, payout = 0

        // Update bet as resolved
        const { error: updateBetError } = await supabase
          .from('bets')
          .update({
            is_resolved: true,
            payout: payout,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet.id);

        if (updateBetError) throw updateBetError;

        if (won && payout > 0) {
          // Credit user's account
          const { data: userData, error: userFetchError } = await supabase
            .from('users')
            .select('points')
            .eq('id', bet.user_id)
            .single();

          if (userFetchError) throw userFetchError;

          const { error: updateUserError } = await supabase
            .from('users')
            .update({ points: (userData.points || 0) + payout })
            .eq('id', bet.user_id);

          if (updateUserError) throw updateUserError;

          // Create transaction record
          const { data: championData } = await supabase
            .from('champions')
            .select('name')
            .eq('id', bet.champion_id)
            .single();

          const { error: txError } = await supabase
            .from('transactions')
            .insert([{
              user_id: bet.user_id,
              amount: payout,
              reason: `Winning bet payout: ${bet.is_for ? 'For' : 'Against'} ${championData?.name || 'Unknown'}`,
              meta: {
                bet_id: bet.id,
                bet_type: bet.is_for ? 'for' : 'against',
                champion_id: bet.champion_id,
                payout: payout,
                original_bet: bet.amount,
                odds: bet.odds,
              },
            }]);

          if (txError) throw txError;

          console.log(`Paid out $${payout} to user ${bet.user_id}`);
        }
      }

      console.log('Market resolution complete');
    } catch (error) {
      console.error('Error resolving market:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const winner = champions.find((c) => c.isWinner);

  return (
    <div className="space-y-6">
      {isResolving && (
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <div className="text-sm text-yellow-700 font-medium">
            Resolving market and processing payouts... Please wait.
          </div>
        </div>
      )}

      {winner && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <div className="text-sm text-green-700">
            <strong className="font-semibold">Market Resolved:</strong> {winner.name} has been crowned the winner! 
            All bets have been resolved and payouts credited.
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Champion Management
          </h3>
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="mt-2 rounded-md bg-blue-50 p-4 text-sm text-blue-700">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Add champions before the competition starts</li>
              <li>Mark champions as eliminated as they drop out</li>
              <li>When ready, crown the final winner to resolve all bets and pay out winnings</li>
              <li><strong>Warning:</strong> Setting a winner will resolve the entire market and cannot be undone!</li>
            </ul>
          </div>

          <form onSubmit={addChampion} className="mt-5">
            <div className="flex rounded-md shadow-sm">
              <input
                type="text"
                value={newChampionName}
                onChange={(e) => setNewChampionName(e.target.value)}
                className="flex-1 rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter champion name"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-none rounded-r-md border border-l-0 border-gray-300 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add Champion
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {champions.map((champion) => (
                    <tr key={champion.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {champion.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {champion.isWinner ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Winner
                          </span>
                        ) : champion.isEliminated ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                            Eliminated
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => toggleEliminationStatus(champion)}
                          disabled={isResolving || winner !== undefined}
                          className="mr-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {champion.isEliminated ? 'Restore' : 'Eliminate'}
                        </button>
                        <button
                          onClick={() => setWinner(champion)}
                          disabled={champion.isWinner || isResolving || winner !== undefined}
                          className={`rounded px-2 py-1 text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            champion.isWinner || winner
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-500 focus-visible:outline-green-600'
                          }`}
                        >
                          {champion.isWinner ? 'Current Winner' : 'Crown Winner'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin; 