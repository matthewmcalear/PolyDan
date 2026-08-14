import {
  calculatePoolOdds,
  getChampionOdds,
  calculatePayout,
  calculateProfit,
  formatProbability,
  formatDecimalOdds,
} from '../odds';

describe('Pool-based odds calculations', () => {
  describe('calculatePoolOdds', () => {
    it('should return even odds when no bets exist', () => {
      const bets: Array<{ championId: string; amount: number; isFor: boolean }> = [];
      const championIds = ['champ1', 'champ2', 'champ3'];
      
      const result = calculatePoolOdds(bets, championIds);
      
      expect(result.size).toBe(3);
      expect(result.get('champ1')?.impliedProbability).toBeCloseTo(0.333, 2);
      expect(result.get('champ1')?.decimalOdds).toBeCloseTo(3, 1);
    });

    it('should calculate correct odds with uneven stakes', () => {
      const bets = [
        { championId: 'champ1', amount: 600, isFor: true },
        { championId: 'champ2', amount: 300, isFor: true },
        { championId: 'champ3', amount: 100, isFor: true },
      ];
      const championIds = ['champ1', 'champ2', 'champ3'];
      
      const result = calculatePoolOdds(bets, championIds);
      
      // Total pool = 1000
      // champ1: 600/1000 = 60% probability, 1/0.6 = 1.67 odds
      expect(result.get('champ1')?.impliedProbability).toBeCloseTo(0.6, 2);
      expect(result.get('champ1')?.decimalOdds).toBeCloseTo(1.67, 2);
      
      // champ2: 300/1000 = 30% probability, 1/0.3 = 3.33 odds
      expect(result.get('champ2')?.impliedProbability).toBeCloseTo(0.3, 2);
      expect(result.get('champ2')?.decimalOdds).toBeCloseTo(3.33, 2);
      
      // champ3: 100/1000 = 10% probability, 1/0.1 = 10 odds
      expect(result.get('champ3')?.impliedProbability).toBeCloseTo(0.1, 2);
      expect(result.get('champ3')?.decimalOdds).toBeCloseTo(10, 2);
    });

    it('should ignore "Against" bets in pool calculation', () => {
      const bets = [
        { championId: 'champ1', amount: 500, isFor: true },
        { championId: 'champ1', amount: 200, isFor: false }, // Against bet, ignored
        { championId: 'champ2', amount: 500, isFor: true },
      ];
      const championIds = ['champ1', 'champ2'];
      
      const result = calculatePoolOdds(bets, championIds);
      
      // Total pool = 1000 (500 + 500), not 1200
      expect(result.get('champ1')?.impliedProbability).toBeCloseTo(0.5, 2);
      expect(result.get('champ2')?.impliedProbability).toBeCloseTo(0.5, 2);
    });

    it('should handle champion with no bets', () => {
      const bets = [
        { championId: 'champ1', amount: 1000, isFor: true },
      ];
      const championIds = ['champ1', 'champ2', 'champ3'];
      
      const result = calculatePoolOdds(bets, championIds);
      
      // champ1 has 100% of stakes
      expect(result.get('champ1')?.impliedProbability).toBe(1);
      expect(result.get('champ1')?.decimalOdds).toBe(1);
      
      // champ2 and champ3 have no stakes, get long odds (2x field size)
      expect(result.get('champ2')?.impliedProbability).toBe(0);
      expect(result.get('champ2')?.decimalOdds).toBe(6);
    });
  });

  describe('getChampionOdds', () => {
    it('should return correct odds for a specific champion', () => {
      const bets = [
        { championId: 'champ1', amount: 700, isFor: true },
        { championId: 'champ2', amount: 300, isFor: true },
      ];
      const championIds = ['champ1', 'champ2'];
      
      const result = getChampionOdds('champ1', bets, championIds);
      
      expect(result.impliedProbability).toBeCloseTo(0.7, 2);
      expect(result.decimalOdds).toBeCloseTo(1.43, 2);
    });

    it('should return zero odds for eliminated champion', () => {
      const bets = [
        { championId: 'champ1', amount: 500, isFor: true },
        { championId: 'champ2', amount: 500, isFor: true },
      ];
      const activeChampionIds = ['champ1']; // champ2 eliminated
      
      const result = getChampionOdds('champ2', bets, activeChampionIds);
      
      expect(result.impliedProbability).toBe(0);
      expect(result.decimalOdds).toBe(0);
    });
  });

  describe('calculatePayout', () => {
    it('should calculate correct payout', () => {
      expect(calculatePayout(100, 2.5)).toBe(250);
      expect(calculatePayout(50, 10)).toBe(500);
      expect(calculatePayout(200, 1.5)).toBe(300);
    });
  });

  describe('calculateProfit', () => {
    it('should calculate profit (payout minus stake)', () => {
      expect(calculateProfit(100, 2.5)).toBe(150); // 250 - 100
      expect(calculateProfit(50, 10)).toBe(450); // 500 - 50
      expect(calculateProfit(200, 1.5)).toBe(100); // 300 - 200
    });
  });

  describe('formatting functions', () => {
    it('should format probability as percentage', () => {
      expect(formatProbability(0.333)).toBe('33.3%');
      expect(formatProbability(0.6)).toBe('60.0%');
      expect(formatProbability(1)).toBe('100.0%');
    });

    it('should format decimal odds', () => {
      expect(formatDecimalOdds(2.5)).toBe('2.50');
      expect(formatDecimalOdds(10)).toBe('10.00');
      expect(formatDecimalOdds(1.43)).toBe('1.43');
    });
  });
});
