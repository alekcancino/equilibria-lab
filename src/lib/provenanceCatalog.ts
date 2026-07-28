import type { ConstantSource } from './provenance';
import { ACIDS, INDICATORS, SALTS } from './database';
import { METAL_INDICATORS, EDTA_METAL_PRESETS } from './indicatorDatabase';
import { RESIN_PRESETS, APPLICATION_PRESETS } from './ionExchangeDatabase';
import { EXTRACTION_PRESETS } from './extractionDatabase';
import { COMPLEX_PRESETS } from './complexDatabase';
import { REDOX_COUPLES } from './redoxDatabase';
import { SPECIATION_PRESETS } from './speciationDatabase';
import { SYSTEM_PRESETS } from './systemPresets';

export {
  ACIDS,
  INDICATORS,
  SALTS,
  METAL_INDICATORS,
  EDTA_METAL_PRESETS,
  RESIN_PRESETS,
  APPLICATION_PRESETS,
  EXTRACTION_PRESETS,
  COMPLEX_PRESETS,
  REDOX_COUPLES,
  SPECIATION_PRESETS,
  SYSTEM_PRESETS,
};

export function migratedPresetSources(): ConstantSource[] {
  return [
    ...RESIN_PRESETS.map((preset) => preset.source),
    ...APPLICATION_PRESETS.map((preset) => preset.source),
    ...EXTRACTION_PRESETS.map((preset) => preset.source),
    ...COMPLEX_PRESETS.map((preset) => preset.source),
    ...REDOX_COUPLES.map((preset) => preset.source),
    ...SPECIATION_PRESETS.map((preset) => preset.source),
    ...SYSTEM_PRESETS.map((preset) => preset.source),
    ...ACIDS.map((preset) => preset.source),
    ...SALTS.map((preset) => preset.source),
    ...INDICATORS.map((preset) => preset.source),
    ...METAL_INDICATORS.map((preset) => preset.source),
    ...EDTA_METAL_PRESETS.map((preset) => preset.source),
  ];
}
