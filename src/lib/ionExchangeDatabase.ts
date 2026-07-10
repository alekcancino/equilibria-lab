/** Ion exchange resin presets (typical capacities and selectivities). */

export interface ResinPreset {
  id: string;
  name: string;
  capacity: number;   // eq/L resin
  /** Ksel for Na/Ca or documented primary pair */
  ksel: number;
  ionA: string;
  ionB: string;
  /** Charge magnitude of ion A (default 1 if omitted). */
  zA: number;
  /** Charge magnitude of ion B (default 1 if omitted). */
  zB: number;
  reference: string;
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
    reference: 'Harvey, Ion Exchange; datos típicos 25 °C',
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
    reference: 'Rohm & Haas technical data (aprox.)',
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
    reference: 'Resina aniónica fuerte; Ksel orientativo',
  },
  {
    id: 'chelating',
    name: 'Resina quelato (iminodiacétato)',
    capacity: 0.8,
    ksel: 45,
    ionA: 'Pb²⁺',
    ionB: 'Ca²⁺',
    zA: 2,
    zB: 2,
    reference: 'Chelex / IDA; alta selectividad por metales pesados',
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
}

export const APPLICATION_PRESETS: ResinApplicationPreset[] = [
  { id: 'softening', label: 'Ablandamiento (Ca/Mg vs Na)', cA0: 0.005, cB0: 0.01, ksel: 2.5, ionA: 'Ca²⁺', ionB: 'Na⁺', zA: 2, zB: 1, resinId: 'dowex50' },
  { id: 'pb-removal', label: 'Retención de Pb²⁺', cA0: 0.001, cB0: 0.01, ksel: 45, ionA: 'Pb²⁺', ionB: 'Ca²⁺', zA: 2, zB: 2, resinId: 'chelating' },
  { id: 'ca-mg', label: 'Ca²⁺ / Mg²⁺ selectivo', cA0: 0.005, cB0: 0.01, ksel: 1.8, ionA: 'Ca²⁺', ionB: 'Mg²⁺', zA: 2, zB: 2, resinId: 'dowex50' },
];
