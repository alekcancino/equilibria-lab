import { describe, expect, it } from 'vitest';
import { balancedRedoxReaction, electronTransferCount } from '../redox';
import { REDOX_COUPLES } from '../redoxDatabase';

const couple = (id: string) => REDOX_COUPLES.find((entry) => entry.id === id)!;

describe('balanced redox reaction', () => {
  it('shows both products for a one-electron reaction', () => {
    const reaction = balancedRedoxReaction(couple('ce'), couple('fe'));
    expect(reaction.equation).toBe('Ce⁴⁺ + Fe²⁺ → Ce³⁺ + Fe³⁺');
    expect(reaction.electrons).toBe(1);
  });

  it('scales and cancels electrons for permanganate and iron', () => {
    const reaction = balancedRedoxReaction(couple('mno4'), couple('fe'));
    expect(reaction.equation).toBe('MnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 4H₂O + 5Fe³⁺');
    expect(reaction.electrons).toBe(5);
  });

  it('uses the least common multiple rather than multiplying equal electron counts', () => {
    expect(electronTransferCount(2, 2)).toBe(2);
    expect(electronTransferCount(5, 2)).toBe(10);
  });
});
