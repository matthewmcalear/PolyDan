/**
 * Pool-based odds calculation utilities for PolyDan
 * 
 * Parimutuel betting: All bets go into a pool, and odds are determined by
 * the proportion of money bet on each outcome. Eliminated champions' bets
 * stay in the pool until market resolution (no refunds).
 */

export interface PoolStats {
  championId: string;
  totalStaked: number;
  impliedProbability: number;
  decimalOdds: number;
}

/**
 * Calculate pool-based odds for all active champions
 * 
 * @param bets - Array of all bets (only "For" bets count toward champion pools)
 * @param championIds - Array of champion IDs still in the running (not eliminated)
 * @returns Map of championId to pool statistics
 */
export function calculatePoolOdds(
  bets: Array<{ championId: string; amount: number; isFor: boolean }>,
  championIds: string[]
): Map<string, PoolStats> {
  const poolStats = new Map<string, PoolStats>();
  
  // Calculate total staked on each champion (only "For" bets)
  const championStakes = new Map<string, number>();
  let totalPool = 0;
  
  for (const bet of bets) {
    if (bet.isFor) {
      const current = championStakes.get(bet.championId) || 0;
      championStakes.set(bet.championId, current + bet.amount);
      totalPool += bet.amount;
    }
  }
  
  // If no bets yet, assume even odds across all remaining champions
  if (totalPool === 0) {
    const evenProbability = 1 / championIds.length;
    const evenOdds = 1 / evenProbability;
    
    for (const championId of championIds) {
      poolStats.set(championId, {
        championId,
        totalStaked: 0,
        impliedProbability: evenProbability,
        decimalOdds: evenOdds,
      });
    }
    return poolStats;
  }
  
  // Calculate implied probability and decimal odds for each champion
  for (const championId of championIds) {
    const staked = championStakes.get(championId) || 0;
    
    // Implied probability = champion's stake / total pool
    // Add small epsilon to avoid division by zero
    const impliedProbability = totalPool > 0 ? staked / totalPool : 0;
    
    // Decimal odds = 1 / probability
    // If nobody bet on this champion, give them long odds
    const decimalOdds = impliedProbability > 0 
      ? 1 / impliedProbability 
      : championIds.length * 2; // 2x the field size for unbacked champions
    
    poolStats.set(championId, {
      championId,
      totalStaked: staked,
      impliedProbability,
      decimalOdds,
    });
  }
  
  return poolStats;
}

/**
 * Get odds for a specific champion
 */
export function getChampionOdds(
  championId: string,
  bets: Array<{ championId: string; amount: number; isFor: boolean }>,
  activeChampionIds: string[]
): { impliedProbability: number; decimalOdds: number } {
  const poolStats = calculatePoolOdds(bets, activeChampionIds);
  const stats = poolStats.get(championId);
  
  if (!stats) {
    // Champion not in active list, return 0 odds
    return { impliedProbability: 0, decimalOdds: 0 };
  }
  
  return {
    impliedProbability: stats.impliedProbability,
    decimalOdds: stats.decimalOdds,
  };
}

/**
 * Calculate payout for a winning bet
 * 
 * @param betAmount - Amount wagered
 * @param decimalOdds - Decimal odds at time of bet
 * @returns Payout amount (includes original stake)
 */
export function calculatePayout(betAmount: number, decimalOdds: number): number {
  return betAmount * decimalOdds;
}

/**
 * Calculate profit (payout minus original stake)
 */
export function calculateProfit(betAmount: number, decimalOdds: number): number {
  return calculatePayout(betAmount, decimalOdds) - betAmount;
}

/**
 * Format odds as a percentage
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * Format decimal odds
 */
export function formatDecimalOdds(odds: number): string {
  return odds.toFixed(2);
}
