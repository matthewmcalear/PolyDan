import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Champion } from '../types';

const Admin: React.FC = () => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [newChampionName, setNewChampionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setChampions(data || []);
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
        setChampions([...champions, ...data]);
        setNewChampionName('');
      }
    } catch (error) {
      console.error('Error adding champion:', error);
      setError('Failed to add champion');
    }
  };

  const toggleEliminationStatus = async (champion: Champion) => {
    try {
      const { error } = await supabase
        .from('champions')
        .update({
          is_eliminated: !champion.isEliminated,
          is_winner: false, // Reset winner status if marking as eliminated
        })
        .eq('id', champion.id);

      if (error) throw error;
      
      setChampions(champions.map(c => 
        c.id === champion.id 
          ? { ...c, isEliminated: !champion.isEliminated, isWinner: false }
          : c
      ));
    } catch (error) {
      console.error('Error updating champion status:', error);
      setError('Failed to update champion status');
    }
  };

  const setWinner = async (champion: Champion) => {
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
          is_eliminated: false, // Un-eliminate if they were eliminated
        })
        .eq('id', champion.id);

      if (error) throw error;

      setChampions(champions.map(c => ({
        ...c,
        isWinner: c.id === champion.id,
        isEliminated: c.id === champion.id ? false : c.isEliminated,
      })));
    } catch (error) {
      console.error('Error setting winner:', error);
      setError('Failed to set winner');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
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
                          className="mr-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          {champion.isEliminated ? 'Restore' : 'Eliminate'}
                        </button>
                        <button
                          onClick={() => setWinner(champion)}
                          disabled={champion.isWinner}
                          className={`rounded px-2 py-1 text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            champion.isWinner
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-500 focus-visible:outline-green-600'
                          }`}
                        >
                          {champion.isWinner ? 'Current Winner' : 'Set as Winner'}
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