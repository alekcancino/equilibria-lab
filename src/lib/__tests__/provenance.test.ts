import { describe, expect, it } from 'vitest';
import { isCompleteConstantSource } from '../provenance';
import { migratedPresetSources } from '../provenanceCatalog';
import { EXTRACTION_PRESETS } from '../extractionDatabase';
import { RESIN_PRESETS } from '../ionExchangeDatabase';
import { SPECIATION_PRESETS } from '../speciationDatabase';
import { REDOX_COUPLES } from '../redoxDatabase';

describe('provenance metadata guard', () => {
  it('requires complete ConstantSource on all migrated preset catalogs', () => {
    const sources = migratedPresetSources();
    expect(sources.length).toBeGreaterThanOrEqual(40);
    for (const source of sources) {
      expect(isCompleteConstantSource(source)).toBe(true);
    }
  });

  it('marks approximate Ksel resin presets and pb_dithiz as illustrative', () => {
    const illustrativeResins = RESIN_PRESETS.filter((preset) =>
      ['dowex50', 'amberlite120', 'amberlite400'].includes(preset.id),
    );
    expect(illustrativeResins).toHaveLength(3);
    illustrativeResins.forEach((preset) => {
      expect(preset.source.quality).toBe('illustrative');
    });

    const pbDithiz = EXTRACTION_PRESETS.find((preset) => preset.id === 'pb_dithiz');
    expect(pbDithiz?.source.quality).toBe('illustrative');
  });

  it('marks al-oh speciation and polynuclear redox couples with caveats as illustrative or secondary', () => {
    const alOh = SPECIATION_PRESETS.find((preset) => preset.id === 'al-oh');
    expect(alOh?.source.quality).toBe('illustrative');
    expect(alOh?.needsVerification).toBe(true);

    const i2 = REDOX_COUPLES.find((couple) => couple.id === 'i2');
    expect(i2?.caveat).toBeTruthy();
    expect(i2?.source.quality).toBe('secondary');
  });
});
