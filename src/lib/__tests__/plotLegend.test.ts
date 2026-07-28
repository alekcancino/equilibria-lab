import { describe, expect, it } from 'vitest';
import { applySeriesEncoding, SERIES_DASH_CYCLE } from '../plotSeriesStyle';
import { legendPlan, verticalLegendRightMargin } from '../plotLegend';
import type { Data } from 'plotly.js';

describe('legendPlan', () => {
  it('uses a vertical right legend for seven Pourbaix-style entries with long labels', () => {
    const plan = legendPlan({
      entryCount: 7,
      longestLabelChars: 'Fe(OH)₃ / Fe²⁺'.length,
      viewportWidth: 1440,
      mobile: false,
    });
    expect(plan.orientation).toBe('v');
    expect(plan.position.x).toBe(1.02);
    expect(plan.margin.r).toBeGreaterThanOrEqual(
      verticalLegendRightMargin('Fe(OH)₃ / Fe²⁺'.length),
    );
  });

  it('keeps two desktop series on a horizontal bottom legend', () => {
    const plan = legendPlan({
      entryCount: 2,
      longestLabelChars: 8,
      viewportWidth: 1440,
      mobile: false,
    });
    expect(plan.orientation).toBe('h');
    expect(plan.position.y).toBe(-0.2);
  });

  it('stacks mobile legends above the plot in two columns', () => {
    const plan = legendPlan({
      entryCount: 6,
      longestLabelChars: 10,
      viewportWidth: 375,
      mobile: true,
    });
    expect(plan.columns).toBe(2);
    expect(plan.rows).toBe(3);
    expect(plan.position.y).toBe(1.07);
  });
});

describe('applySeriesEncoding', () => {
  it('assigns three distinct dashes to three legend line traces', () => {
    const data: Data[] = [
      { type: 'scatter', mode: 'lines', name: 'A', line: { color: '#000' } },
      { type: 'scatter', mode: 'lines', name: 'B', line: { color: '#111' } },
      { type: 'scatter', mode: 'lines', name: 'C', line: { color: '#222' } },
    ];
    const encoded = applySeriesEncoding(data) as Array<{ line?: { dash?: string } }>;
    const dashes = encoded.map((trace) => trace.line?.dash);
    expect(new Set(dashes).size).toBe(3);
    expect(dashes[0]).toBe(SERIES_DASH_CYCLE[0]);
    expect(dashes[1]).toBe(SERIES_DASH_CYCLE[1]);
    expect(dashes[2]).toBe(SERIES_DASH_CYCLE[2]);
  });

  it('leaves an explicit dash untouched', () => {
    const data: Data[] = [
      { type: 'scatter', mode: 'lines', name: 'A', line: { color: '#000' } },
      { type: 'scatter', mode: 'lines', name: 'B', line: { color: '#111', dash: 'dot' } },
      { type: 'scatter', mode: 'lines', name: 'C', line: { color: '#222' } },
    ];
    const encoded = applySeriesEncoding(data) as Array<{ line?: { dash?: string } }>;
    expect(encoded[1].line?.dash).toBe('dot');
  });

  it('does not dash fewer than three legend lines', () => {
    const data: Data[] = [
      { type: 'scatter', mode: 'lines', name: 'A', line: { color: '#000' } },
      { type: 'scatter', mode: 'lines', name: 'B', line: { color: '#111' } },
    ];
    const encoded = applySeriesEncoding(data) as Array<{ line?: { dash?: string } }>;
    expect(encoded.every((trace) => !trace.line?.dash || trace.line.dash === 'solid')).toBe(true);
  });
});
