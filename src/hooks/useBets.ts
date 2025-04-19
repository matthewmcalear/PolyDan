import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Bet } from '../types';

// Generic fetcher returning typed array of bets
const fetchBets = async (): Promise<Bet[]> => {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Bet[];
};

interface UseBetsOptions {
  userId?: string; // optional filter for current user
}

export function useBets(options: UseBetsOptions = {}) {
  const key = options.userId ? `bets-user-${options.userId}` : 'bets-all';
  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    if (options.userId) {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', options.userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Bet[];
    }
    return fetchBets();
  }, {
    refreshInterval: 8000,
  });

  // Place a new bet and debit user points via RPC or manual updates
  const placeBet = async (payload: {
    user_id: string;
    champion_id: string;
    amount: number;
    odds: number;
    is_for: boolean;
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
    await updateBet(id, { isResolved: true, payout });
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