import { describe, expect, it } from 'vitest';
import {
  buildArbitraryDiagram, getSystemDef, presetToArbitrary, S_NERNST,
  type ArbSpecies, type ArbCouple,
} from '../pourbaix';

const S = S_NERNST;
const PKW = 14;

// Simple M²⁺ / M(OH)₂ / M system — same as the old SimpleCustom default
const DEFAULT_SPECIES: ArbSpecies[] = [
  { kind: 'ion',      formula: 'M²⁺',    z: 2 },
  { kind: 'hydroxide',formula: 'M(OH)₂', z: 2, pKsp: 15.8, ionRef: 'M²⁺' },
  { kind: 'metal',    formula: 'M' },
];
const DEFAULT_COUPLES: ArbCouple[] = [
  { ox: 'M²⁺', red: 'M', E0: -0.257, n: 2 },
];
const logC = -2;

describe('buildArbitraryDiagram — simple 3-species system', () => {
  const d = buildArbitraryDiagram(DEFAULT_SPECIES, DEFAULT_COUPLES, logC);

  it('produces the correct precipitation pH', () => {
    // pH = PKW - (pKsp + logC) / z = 14 - (15.8 - 2)/2 = 14 - 6.9 = 7.1
    const expected = PKW - (15.8 + logC) / 2;
    const vert = d.lines.find((l) => l.vertical);
    expect(vert).toBeDefined();
    expect(vert!.pH[0]).toBeCloseTo(expected, 3);
  });

  it('deposition boundary is horizontal (B = 0)', () => {
    // E = E0 + (S/n)·logC → same at pH 0 and pH 7
    const dep = d.lines.find((l) => l.name === 'M²⁺ / M' && !l.vertical);
    expect(dep).toBeDefined();
    const E0 = dep!.E[0];
    const Emid = dep!.E[dep!.E.length - 1];
    expect(Math.abs(E0 - Emid)).toBeLessThan(1e-9);
    // E° = -0.257 + (S/2)·(-2)
    const expectedE = -0.257 + (S / 2) * logC;
    expect(E0).toBeCloseTo(expectedE, 5);
  });

  it('solid/metal boundary has correct E0\' (E(pH) = A − B·pH)', () => {
    const sol = d.lines.find((l) => l.name === 'M(OH)₂ / M' && !l.vertical);
    expect(sol).toBeDefined();
    // E0' = E0 + (S/n)·(z·PKW - pKsp) = -0.257 + (S/2)·(2·14 - 15.8)
    const E0p = -0.257 + (S / 2) * (2 * PKW - 15.8);
    const B = (S / 2) * 2; // slope = (S/n)·z
    // Verify E = A - B·pH at each point in the line
    for (let i = 0; i < sol!.pH.length; i++) {
      const E_expected = E0p - B * sol!.pH[i];
      expect(sol!.E[i]).toBeCloseTo(E_expected, 5);
    }
  });

  it('generates exactly 3 boundary lines (deposition + solid/metal + vertical)', () => {
    expect(d.lines).toHaveLength(3);
  });

  it('generates region labels for all 3 species', () => {
    expect(d.regions.length).toBeGreaterThanOrEqual(3);
    const names = d.regions.map((r) => r.name);
    expect(names).toContain('M²⁺');
    expect(names).toContain('M(OH)₂');
    expect(names).toContain('M(s)');
  });

  it('deposition boundary clips before precipitation pH', () => {
    const dep = d.lines.find((l) => l.name === 'M²⁺ / M' && !l.vertical);
    const pHmax = Math.max(...dep!.pH);
    const pHprec = PKW - (15.8 + logC) / 2;
    expect(pHmax).toBeCloseTo(pHprec, 3);
  });

  it('solid/metal boundary starts at precipitation pH', () => {
    const sol = d.lines.find((l) => l.name === 'M(OH)₂ / M' && !l.vertical);
    const pHmin = Math.min(...sol!.pH);
    const pHprec = PKW - (15.8 + logC) / 2;
    expect(pHmin).toBeCloseTo(pHprec, 3);
  });
});

describe('buildArbitraryDiagram — two-couple Fe-like system', () => {
  // Fe: Fe³⁺/Fe(OH)₃/Fe²⁺/Fe(OH)₂/Fe with two couples
  const species: ArbSpecies[] = [
    { kind: 'ion',      formula: 'Fe³⁺',    z: 3 },
    { kind: 'hydroxide',formula: 'Fe(OH)₃', z: 3, pKsp: 38.7, ionRef: 'Fe³⁺' },
    { kind: 'ion',      formula: 'Fe²⁺',    z: 2 },
    { kind: 'hydroxide',formula: 'Fe(OH)₂', z: 2, pKsp: 14.7, ionRef: 'Fe²⁺' },
    { kind: 'metal',    formula: 'Fe' },
  ];
  const couples: ArbCouple[] = [
    { ox: 'Fe³⁺', red: 'Fe²⁺', E0: 0.771, n: 1 },
    { ox: 'Fe²⁺', red: 'Fe',   E0: -0.440, n: 2 },
  ];
  const d = buildArbitraryDiagram(species, couples, logC);

  it('generates two precipitation lines', () => {
    const verts = d.lines.filter((l) => l.vertical);
    expect(verts).toHaveLength(2);
  });

  it('generates both_hydroxides boundary (Fe(OH)₃ / Fe(OH)₂)', () => {
    const bh = d.lines.find((l) => l.name === 'Fe(OH)₃ / Fe(OH)₂');
    expect(bh).toBeDefined();
  });

  it('generates ox_solid_red_ion boundary (Fe(OH)₃ / Fe²⁺)', () => {
    const si = d.lines.find((l) => l.name === 'Fe(OH)₃ / Fe²⁺');
    expect(si).toBeDefined();
  });

  it('Fe(OH)₂ precipitation pH is correct', () => {
    const expected = PKW - (14.7 + logC) / 2; // = 14 - 6.35 = 7.65
    const vert = d.lines.find((l) => l.name === 'Fe²⁺ / Fe(OH)₂');
    expect(vert?.pH[0]).toBeCloseTo(expected, 2);
  });

  it('both_hydroxides boundary starts at max precipitation pH', () => {
    const bh = d.lines.find((l) => l.name === 'Fe(OH)₃ / Fe(OH)₂');
    expect(bh).toBeDefined();
    const pHFe3 = PKW - (38.7 + logC) / 3;
    const pHFe2 = PKW - (14.7 + logC) / 2;
    const clipMin = Math.max(pHFe3, pHFe2);
    expect(Math.min(...bh!.pH)).toBeCloseTo(clipMin, 2);
  });
});

describe('buildArbitraryDiagram — species without couple produce no boundaries', () => {
  it('orphan species (no couple involving it) generates no non-vertical boundary', () => {
    const species: ArbSpecies[] = [
      { kind: 'ion',      formula: 'A³⁺', z: 3 },
      { kind: 'ion',      formula: 'B²⁺', z: 2 }, // orphan — no couple
      { kind: 'metal',    formula: 'A' },
    ];
    const couples: ArbCouple[] = [
      { ox: 'A³⁺', red: 'A', E0: -0.1, n: 3 },
    ];
    const d = buildArbitraryDiagram(species, couples, -2);
    // Only one deposition boundary (A³⁺/A); no boundary mentions B²⁺
    const mentionsB = d.lines.filter((l) => l.name.includes('B²⁺'));
    expect(mentionsB).toHaveLength(0);
  });
});

describe('getSystemDef', () => {
  it('devuelve el SystemDef de un preset conocido', () => {
    expect(getSystemDef('fe')?.name).toBe('Fe-H₂O');
  });

  it('devuelve undefined para ids desconocidos o el _comment (no es un SystemDef)', () => {
    expect(getSystemDef('no-existe')).toBeUndefined();
    expect(getSystemDef('_comment')).toBeUndefined();
  });
});

describe('presetToArbitrary — conversión preset → modo custom', () => {
  it('Fe: sistema solo-hidróxido, sin pérdida', () => {
    const { arb, warnings } = presetToArbitrary(getSystemDef('fe')!);
    expect(warnings).toHaveLength(0);
    expect(arb.couples).toHaveLength(2);
    const fe3 = arb.species.find((s) => s.formula === 'Fe³⁺');
    const fe2 = arb.species.find((s) => s.formula === 'Fe²⁺');
    const feoh3 = arb.species.find((s) => s.formula === 'Fe(OH)₃');
    const feoh2 = arb.species.find((s) => s.formula === 'Fe(OH)₂');
    const fe = arb.species.find((s) => s.formula === 'Fe' && s.kind === 'metal');
    expect(fe3).toMatchObject({ kind: 'ion', z: 3 });
    expect(fe2).toMatchObject({ kind: 'ion', z: 2 });
    expect(feoh3).toMatchObject({ kind: 'hydroxide', z: 3, pKsp: 39.0, ionRef: 'Fe³⁺' });
    expect(feoh2).toMatchObject({ kind: 'hydroxide', z: 2, pKsp: 15.0, ionRef: 'Fe²⁺' });
    expect(fe).toBeDefined();
  });

  it('Fe: el diagrama derivado del custom convertido reproduce E° de la couple aqueous en pH=0', () => {
    const { arb } = presetToArbitrary(getSystemDef('fe')!);
    const d = buildArbitraryDiagram(arb.species, arb.couples, -2);
    const line = d.lines.find((l) => l.name === 'Fe³⁺ / Fe²⁺');
    expect(line).toBeDefined();
    expect(line!.E[0]).toBeCloseTo(0.771, 6);
  });

  it('Cr: 4 couples, todas convertibles (HCrO₄⁻ y Cr²⁺ sin Solid.z usan el fallback de carga)', () => {
    const { arb, warnings } = presetToArbitrary(getSystemDef('cr')!);
    expect(warnings).toHaveLength(0);
    expect(arb.couples).toHaveLength(4);
    expect(arb.species.find((s) => s.formula === 'HCrO₄⁻')).toMatchObject({ kind: 'ion', z: 1 });
    expect(arb.species.find((s) => s.formula === 'Cr²⁺')).toMatchObject({ kind: 'ion', z: 2 });
  });

  it('Cu: Cu₂O (tipo "oxide1") se omite con warning; las 3 couples (ninguna referencia Cu₂O directo) se conservan', () => {
    const { arb, warnings } = presetToArbitrary(getSystemDef('cu')!);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Cu₂O');
    expect(arb.couples).toHaveLength(3);
    expect(arb.species.some((s) => s.formula === 'Cu₂O')).toBe(false);
    expect(arb.species.find((s) => s.formula === 'Cu⁺')).toMatchObject({ kind: 'ion', z: 1 });
  });

  it('Mn: la couple MnO₂/Mn²⁺ (óxido referenciado sin modelo de disolución) se omite con warning', () => {
    const { arb, warnings } = presetToArbitrary(getSystemDef('mn')!);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('MnO₂');
    expect(arb.couples).toHaveLength(1);
    expect(arb.couples[0]).toMatchObject({ ox: 'Mn²⁺', red: 'Mn' });
    expect(arb.species.find((s) => s.formula === 'Mn(OH)₂')).toMatchObject({ kind: 'hydroxide' });
  });

  it('Pb: mismo patrón que Mn — la couple PbO₂/Pb²⁺ se omite con warning', () => {
    const { arb, warnings } = presetToArbitrary(getSystemDef('pb')!);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('PbO₂');
    expect(arb.couples).toHaveLength(1);
  });

  it('todos los presets convierten sin lanzar excepción y producen especies/couples no vacíos', () => {
    for (const id of ['fe', 'cu', 'mn', 'zn', 'ni', 'pb', 'cr']) {
      const { arb } = presetToArbitrary(getSystemDef(id)!);
      expect(arb.species.length).toBeGreaterThan(0);
      expect(arb.couples.length).toBeGreaterThan(0);
      expect(() => buildArbitraryDiagram(arb.species, arb.couples, -2)).not.toThrow();
    }
  });
});
