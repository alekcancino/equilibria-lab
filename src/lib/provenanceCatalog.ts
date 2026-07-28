import type { ConstantSource } from '../lib/provenance';
import { RESIN_PRESETS, APPLICATION_PRESETS } from '../lib/ionExchangeDatabase';
import { EXTRACTION_PRESETS } from '../lib/extractionDatabase';

export { RESIN_PRESETS, APPLICATION_PRESETS, EXTRACTION_PRESETS };

export function migratedPresetSources(): ConstantSource[] {
  return [
    ...RESIN_PRESETS.map((preset) => preset.source),
    ...APPLICATION_PRESETS.map((preset) => preset.source),
    ...EXTRACTION_PRESETS.map((preset) => preset.source),
  ];
}
