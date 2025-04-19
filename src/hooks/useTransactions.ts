import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

export function useTransactions(userId?: string) {
  const key = userId ? `transactions-user-${userId}` : 'transactions-all';
  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Transaction[];
  }, {
    refreshInterval: 15000,
  });

  const addTransaction = async (payload: Omit<Transaction, 'id' | 'createdAt'> & { created_at?: string }) => {
    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) throw error;
    await mutate();
  };

  return {
    transactions: data || [],
    isLoading,
    error,
    addTransaction,
    mutate,
  };
} 