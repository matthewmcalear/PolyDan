import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { Champion } from '../types';

const mapChampion = (row: any): Champion => ({
  id: row.id,
  name: row.name,
  isEliminated: row.is_eliminated,
  isWinner: row.is_winner,
  hasRedemptionChance: row.has_redemption_chance,
  isRedeemed: row.is_redeemed,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const fetchChampions = async (): Promise<Champion[]> => {
  const { data, error } = await supabase
    .from('champions')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(mapChampion);
};

export function useChampions() {
  const { data, error, isLoading, mutate } = useSWR('champions', fetchChampions, {
    refreshInterval: 10000, // revalidate every 10s to keep odds up‑to‑date
  });

  const addChampion = async (name: string) => {
    const { error } = await supabase.from('champions').insert([{ name }]);
    if (error) throw error;
    await mutate();
  };

  const updateChampion = async (id: string, fields: Partial<Champion>) => {
    const { error } = await supabase.from('champions').update(fields).eq('id', id);
    if (error) throw error;
    await mutate();
  };

  return {
    champions: data || [],
    isLoading,
    error,
    addChampion,
    updateChampion,
    mutate,
  };
} 