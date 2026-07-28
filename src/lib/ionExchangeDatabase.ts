import type { ConstantSource } from './provenance';

export interface ResinPreset {
  id: string;
  name: string;
  capacity: number;
  ksel: number;
  ionA: string;
  ionB: string;
  zA: number;
  zB: number;
  source: ConstantSource;
}

export const RESIN_PRESETS: ResinPreset[] = [
  {
    id: 'dowex50',
    name: 'Dowex 50W-X8 (Na⁺)',
    capacity: 2.0,
    ksel: 2.4,
    ionA: 'Ca²⁺',
    ionB: 'Na⁺',
    zA: 2,
    zB: 1,
    source: {
      citation: 'Harvey, Ion Exchange',
      locator: 'Typical strong-acid cation resin data',
      temperatureC: 25,
      medium: 'Aqueous, batch selectivity',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
    },
  },
  {
    id: 'amberlite120',
    name: 'Amberlite IR-120 (H⁺)',
    capacity: 1.8,
    ksel: 1.7,
    ionA: 'Ca²⁺',
    ionB: 'H⁺',
    zA: 2,
    zB: 1,
    source: {
      citation: 'Rohm & Haas technical data',
      temperatureC: 25,
      medium: 'Aqueous, batch selectivity',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
      uncertainty: 'Approximate manufacturer summary',
    },
  },
  {
    id: 'amberlite400',
    name: 'Amberlite IRA-400 (Cl⁻)',
    capacity: 1.3,
    ksel: 3.5,
    ionA: 'SO₄²⁻',
    ionB: 'Cl⁻',
    zA: 2,
    zB: 1,
    source: {
      citation: 'Strong-base anion exchange resin',
      locator: 'Orientation value for SO₄²⁻/Cl⁻ selectivity',
      temperatureC: 25,
      medium: 'Aqueous, batch selectivity',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
    },
  },
  {
    id: 'chelating',
    name: 'Resina quelato (iminodiacétato)',
    capacity: 0.8,
    ksel: 45,
    ionA: 'Pb²⁺',
    ionB: 'Ca²⁺',
    zA: 1,
    zB: 1,
    source: {
      citation: 'Chelex / iminodiacetate resin literature',
      locator: 'Heavy-metal selectivity summary',
      temperatureC: 25,
      medium: 'Aqueous, batch selectivity',
      basis: 'concentration',
      quality: 'secondary',
      verifiedOn: '2026-07-28',
    },
  },
];

export interface ResinApplicationPreset {
  id: string;
  label: string;
  cA0: number;
  cB0: number;
  ksel: number;
  ionA: string;
  ionB: string;
  zA: number;
  zB: number;
  resinId: string;
  source: ConstantSource;
}

export const APPLICATION_PRESETS: ResinApplicationPreset[] = [
  {
    id: 'softening',
    label: 'Ablandamiento (Ca/Mg vs Na)',
    cA0: 0.005,
    cB0: 0.01,
    ksel: 2.5,
    ionA: 'Ca²⁺',
    ionB: 'Na⁺',
    zA: 2,
    zB: 1,
    resinId: 'dowex50',
    source: {
      citation: 'Water softening classroom scenario',
      temperatureC: 25,
      medium: 'Aqueous, illustrative feed composition',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
    },
  },
  {
    id: 'pb-removal',
    label: 'Retención de Pb²⁺',
    cA0: 0.001,
    cB0: 0.01,
    ksel: 45,
    ionA: 'Pb²⁺',
    ionB: 'Ca²⁺',
    zA: 1,
    zB: 1,
    resinId: 'chelating',
    source: {
      citation: 'Chelating resin Pb²⁺ retention scenario',
      temperatureC: 25,
      medium: 'Aqueous, illustrative feed composition',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
    },
  },
  {
    id: 'ca-mg',
    label: 'Ca²⁺ / Mg²⁺ selectivo',
    cA0: 0.005,
    cB0: 0.01,
    ksel: 1.8,
    ionA: 'Ca²⁺',
    ionB: 'Mg²⁺',
    zA: 1,
    zB: 1,
    resinId: 'dowex50',
    source: {
      citation: 'Ca/Mg selectivity classroom scenario',
      temperatureC: 25,
      medium: 'Aqueous, illustrative feed composition',
      basis: 'concentration',
      quality: 'illustrative',
      verifiedOn: '2026-07-28',
    },
  },
];
