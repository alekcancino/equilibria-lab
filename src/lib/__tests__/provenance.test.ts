import { describe, expect, it } from 'vitest';
import { isCompleteConstantSource } from '../provenance';
import { migratedPresetSources } from '../provenanceCatalog';
import { EXTRACTION_PRESETS } from '../extractionDatabase';
import { RESIN_PRESETS } from '../ionExchangeDatabase';

describe('provenance metadata guard', () => {
  it('requires complete ConstantSource on migrated ion-exchange and extraction presets', () => {
    for (const source of migratedPresetSources()) {
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
});
