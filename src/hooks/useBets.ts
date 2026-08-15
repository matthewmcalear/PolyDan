import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Bet } from '../types';

const mapBet = (row: any): Bet => ({
  id: row.id,
  user_id: row.user_id,
  market_id: row.market_id,
  outcome: row.outcome,
  points: Number(row.points),
  share_price: Number(row.share_price),
  shares: Number(row.shares),
  payout: row.payout ? Number(row.payout) : null,
  created_at: new Date(row.created_at),
});

const fetchBets = async (): Promise<Bet[]> => {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapBet);
};

interface UseBetsOptions {
  userId?: string;
  marketId?: string;
}

export function useBets(options: UseBetsOptions = {}) {
  let key = 'bets-all';
  if (options.userId) key = `bets-user-${options.userId}`;
  if (options.marketId) key = `bets-market-${options.marketId}`;
  
  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    let query = supabase.from('bets').select('*');
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    if (options.marketId) {
      query = query.eq('market_id', options.marketId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapBet);
  }, {
    refreshInterval: 8000,
  });

  const placeBet = async (payload: {
    user_id: string;
    market_id: string;
    outcome: string;
    points: number;
    share_price: number;
    shares: number;
  }) => {
    const { error } = await supabase.from('bets').insert([payload]);
    if (error) throw error;
    await mutate();
  };

  const updateBet = async (id: string, fields: Partial<Bet>) => {
    const { error } = await supabase.from('bets').update(fields).eq('id', id);
    if (error) throw error;
    await mutate();
  };

  const resolveBet = async (id: string, payout: number) => {
    await updateBet(id, { payout });
  };

  return {
    bets: data || [],
    isLoading,
    error,
    mutate,
    placeBet,
    updateBet,
    resolveBet,
  };
} 