import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Market } from '../types';

const mapMarket = (row: any): Market => ({
  id: row.id,
  title: row.title,
  description: row.description,
  outcomes: row.outcomes || [],
  status: row.status,
  result: row.result,
  is_champion: row.is_champion,
  champion_player_id: row.champion_player_id,
  created_by: row.created_by,
  resolved_by: row.resolved_by,
  resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
  created_at: new Date(row.created_at),
  updated_at: new Date(row.updated_at),
  outcome_prices: row.outcome_prices,
  market_type: row.market_type,
});

const fetchMarkets = async (): Promise<Market[]> => {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapMarket);
};

export function useMarkets(options: { championOnly?: boolean } = {}) {
  const key = options.championOnly ? 'markets-champion' : 'markets-all';
  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    let query = supabase.from('markets').select('*');
    
    if (options.championOnly) {
      query = query.eq('is_champion', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapMarket);
  }, {
    refreshInterval: 10000,
  });

  const addMarket = async (market: {
    title: string;
    description: string;
    outcomes: string[];
    is_champion?: boolean;
    created_by: string;
  }) => {
    const { error } = await supabase.from('markets').insert([{
      ...market,
      status: 'open',
      market_type: 'multi',
      is_champion: market.is_champion || false,
    }]);
    if (error) throw error;
    await mutate();
  };

  const updateMarket = async (id: string, fields: Partial<Market>) => {
    const { error } = await supabase.from('markets').update(fields).eq('id', id);
    if (error) throw error;
    await mutate();
  };

  const resolveMarket = async (id: string, result: string) => {
    await updateMarket(id, {
      status: 'resolved',
      result,
      resolved_at: new Date(),
    });
  };

  return {
    markets: data || [],
    isLoading,
    error,
    addMarket,
    updateMarket,
    resolveMarket,
    mutate,
  };
}
