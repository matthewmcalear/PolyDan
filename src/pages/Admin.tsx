import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Market } from '../types';
import { useAuth } from '../context/AuthContext';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [newMarketTitle, setNewMarketTitle] = useState('');
  const [newMarketDescription, setNewMarketDescription] = useState('');
  const [newMarketOutcomes, setNewMarketOutcomes] = useState('');
  const [newMarketIsChampion, setNewMarketIsChampion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedMarkets = (data || []).map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        outcomes: d.outcomes || [],
        status: d.status,
        result: d.result,
        is_champion: d.is_champion,
        champion_player_id: d.champion_player_id,
        created_by: d.created_by,
        resolved_by: d.resolved_by,
        resolved_at: d.resolved_at ? new Date(d.resolved_at) : null,
        created_at: new Date(d.created_at),
        updated_at: new Date(d.updated_at),
        outcome_prices: d.outcome_prices,
        market_type: d.market_type,
      }));
      
      setMarkets(mappedMarkets);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setError('Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  };

  const addMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketTitle.trim() || !newMarketOutcomes.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const outcomes = newMarketOutcomes.split(',').map(o => o.trim()).filter(o => o);
      
      if (outcomes.length < 2) {
        toast.error('Please provide at least 2 outcomes separated by commas');
        return;
      }

      const { error } = await supabase
        .from('markets')
        .insert([{
          title: newMarketTitle,
          description: newMarketDescription || null,
          outcomes,
          status: 'open',
          is_champion: newMarketIsChampion,
          market_type: 'multi',
          created_by: user.id,
        }]);

      if (error) throw error;
      
      toast.success('Market created successfully!');
      setNewMarketTitle('');
      setNewMarketDescription('');
      setNewMarketOutcomes('');
      setNewMarketIsChampion(false);
      await fetchMarkets();
    } catch (error) {
      console.error('Error creating market:', error);
      toast.error('Failed to create market');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveMarket = async (marketId: string, result: string) => {
    if (!window.confirm(`Are you sure you want to resolve this market with result: ${result}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('markets')
        .update({
          status: 'resolved',
          result,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', marketId);

      if (error) throw error;
      
      toast.success('Market resolved successfully!');
      await fetchMarkets();
    } catch (error) {
      console.error('Error resolving market:', error);
      toast.error('Failed to resolve market');
    }
  };

  const deleteMarket = async (marketId: string) => {
    if (!window.confirm('Are you sure you want to delete this market? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', marketId);

      if (error) throw error;
      
      toast.success('Market deleted successfully!');
      await fetchMarkets();
    } catch (error) {
      console.error('Error deleting market:', error);
      toast.error('Failed to delete market');
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
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create New Market
          </h3>
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={addMarket} className="mt-5 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Market Title
              </label>
              <input
                type="text"
                id="title"
                value={newMarketTitle}
                onChange={(e) => setNewMarketTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2 px-3"
                placeholder="e.g., Who will win?"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={newMarketDescription}
                onChange={(e) => setNewMarketDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2 px-3"
                rows={3}
                placeholder="Market description..."
              />
            </div>

            <div>
              <label htmlFor="outcomes" className="block text-sm font-medium text-gray-700">
                Outcomes (comma-separated)
              </label>
              <input
                type="text"
                id="outcomes"
                value={newMarketOutcomes}
                onChange={(e) => setNewMarketOutcomes(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2 px-3"
                placeholder="e.g., Matthew McAlear, Tom, Sarah"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate outcomes with commas. At least 2 outcomes required.
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_champion"
                checked={newMarketIsChampion}
                onChange={(e) => setNewMarketIsChampion(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_champion" className="ml-2 block text-sm text-gray-900">
                This is the champion/winner market
              </label>
            </div>

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-indigo-600 py-2 px-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Market'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Manage Markets
          </h3>
          
          {markets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No markets yet. Create one above!</p>
          ) : (
            <div className="space-y-4">
              {markets.map((market) => (
                <div
                  key={market.id}
                  className={`p-4 border rounded-lg ${
                    market.status === 'resolved' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{market.title}</h4>
                        {market.is_champion && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Champion Market
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          market.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {market.status}
                        </span>
                      </div>
                      {market.description && (
                        <p className="mt-1 text-sm text-gray-600">{market.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Outcomes:</p>
                    <div className="flex flex-wrap gap-2">
                      {market.outcomes.map((outcome, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                            market.result === outcome
                              ? 'bg-green-100 text-green-800 font-semibold'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {outcome}
                          {market.result === outcome && ' ✓'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {market.status === 'open' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {market.outcomes.map((outcome) => (
                        <button
                          key={outcome}
                          onClick={() => resolveMarket(market.id, outcome)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Resolve as "{outcome}"
                        </button>
                      ))}
                      <button
                        onClick={() => deleteMarket(market.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {market.status === 'resolved' && market.result && (
                    <div className="mt-3 text-sm text-gray-500">
                      Resolved: <span className="font-semibold text-green-600">{market.result}</span>
                      {market.resolved_at && ` on ${new Date(market.resolved_at).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
