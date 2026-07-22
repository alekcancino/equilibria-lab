import { describe, expect, it } from 'vitest';
import { chartTraceFacts } from '../chartAccessibility';

describe('chartTraceFacts', () => {
  it('reports endpoints and an interior maximum for a distribution curve', () => {
    const [fact] = chartTraceFacts([{
      name: 'HA',
      x: [0, 7, 14],
      y: [0, 1, 0],
      type: 'scatter',
    }]);

    expect(fact).toMatchObject({
      name: 'HA',
      startX: 0,
      startY: 0,
      endX: 14,
      endY: 0,
      peakX: 7,
      peakY: 1,
      hasInteriorPeak: true,
      hasInteriorMinimum: false,
    });
  });

  it('ignores hidden and non-numeric traces', () => {
    const facts = chartTraceFacts([
      { x: [0], y: [1], visible: false, type: 'scatter' },
      { x: ['a', 'b', 'c'], y: ['not-a-number', null, ''], type: 'scatter' },
    ]);
    expect(facts).toEqual([]);
  });
});
