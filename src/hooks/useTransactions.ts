import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

export function useTransactions(userId?: string) {
  const key = userId ? `transactions-user-${userId}` : 'transactions-all';
  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    // Transactions table doesn't exist in live schema
    // Return empty array for now
    return [] as Transaction[];
  }, {
    refreshInterval: 15000,
  });

  const addTransaction = async (payload: Omit<Transaction, 'id' | 'createdAt'> & { created_at?: string }) => {
    // No-op since transactions table doesn't exist in live schema
    console.log('Transactions table not implemented in live schema');
  };

  return {
    transactions: data || [],
    isLoading,
    error,
    addTransaction,
    mutate,
  };
} 