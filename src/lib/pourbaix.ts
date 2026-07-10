// Data-driven Pourbaix diagram generator.
// Data-driven Pourbaix engine: only E° and pKsp are primitive inputs; every
// solid-boundary potential is DERIVED via Hess's law, so triple-point closure
// is a mathematical identity (not a numerical coincidence).
//
// Golden-suite identities verified against the original project:
//   Fe(OH)₃/Fe²⁺ E°′ = 0.948 V · Fe(OH)₃/Fe(OH)₂ = 0.179 V · Fe(OH)₂/Fe = −0.056 V
//   Cu(OH)₂/Cu = 0.588 V · Zn(OH)₂/Zn = −0.437 V · Cr(OH)₃/Cr = −0.507 V
//   MnO₂/Mn(OH)₂ = 0.784 V · Mn(OH)₂/Mn = −0.735 V

import SYSTEMS_RAW from './pourbaixSystems.json';
import { NERNST_S, PKW } from './constants';
import { chargeMagnitude } from './speciesNames';

export const S_NERNST = NERNST_S;

interface Couple { ox: string; red: string; E0: number; n: number; m_H?: number }
interface Solid { species: string; ion?: string; z?: number; pKsp?: number; pKd?: number; type?: string }
interface BoundaryDef {
  id: string;
  kind: string;
  couple?: string;
  solid?: string;
  ox_solid?: string;
  red_solid?: string;
  oxide?: string;
  color: string;
  clip_min?: string | { line: string };
  clip_max?: string | { line: string };
  E_min_ref?: string;
  E_max_ref?: string;
}
interface RegionDef { name: string; color: string; pH: (string | number)[]; E: number }
export interface SystemDef {
  name: string;
  note?: string;
  excluded_species?: string[];
  couples: Record<string, Couple>;
  solids: Record<string, Solid>;
  boundaries: BoundaryDef[];
  regions?: RegionDef[];
}

export interface PourbaixLine {
  name: string;
  pH: number[];
  E: number[];
  color: string;
  equation: string;
  vertical: boolean;
}
export interface PourbaixRegion { name: string; color: string; labelPH: number; labelE: number }
export interface PourbaixDiagram {
  lines: PourbaixLine[];
  regions: PourbaixRegion[];
  name: string;
  note: string;
  excluded: string[];
}

const SYSTEMS = SYSTEMS_RAW as unknown as Record<string, SystemDef | string>;

export function availableSystems(): { id: string; name: string }[] {
  return Object.entries(SYSTEMS)
    .filter(([k]) => k !== '_comment')
    .map(([id, def]) => ({ id, name: (def as SystemDef).name }));
}

export function getSystemDef(id: string): SystemDef | undefined {
  // Same exclusion as availableSystems (by key, not by value shape) so the
  // two never disagree about what counts as a real system.
  if (id === '_comment') return undefined;
  const def = SYSTEMS[id];
  return typeof def === 'string' ? undefined : def;
}

/** Affine parameters (A, B) for a non-vertical boundary: E(pH) = A − B·pH */
function affineParams(
  b: BoundaryDef, sysdef: SystemDef, logC: number,
): { A: number; B: number; name: string; eq: string } {
  const couples = sysdef.couples;
  const solids = sysdef.solids;
  const bare = (s: string) => s.replace('(s)', '');

  switch (b.kind) {
    case 'aqueous': {
      const c = couples[b.couple!];
      return {
        A: c.E0, B: 0,
        name: `${bare(c.ox)} / ${bare(c.red)}`,
        eq: `${c.ox} + ${c.n}e⁻ → ${c.red}  |  E° = ${c.E0.toFixed(3)} V`,
      };
    }
    case 'deposition': {
      const c = couples[b.couple!];
      const sn = S_NERNST / c.n;
      return {
        A: c.E0 + sn * logC, B: 0,
        name: `${bare(c.ox)} / ${bare(c.red)}`,
        eq: `${c.ox} + ${c.n}e⁻ → ${c.red}  |  E° = ${c.E0.toFixed(3)} V`,
      };
    }
    case 'oxide_ion': {
      const c = couples[b.couple!];
      const sn = S_NERNST / c.n;
      return {
        A: c.E0 - sn * logC, B: sn * (c.m_H ?? 0),
        name: `${bare(c.ox)} / ${bare(c.red)}`,
        eq: `${c.ox} + ${c.m_H}H⁺ + ${c.n}e⁻ → ${c.red} + H₂O  |  E° = ${c.E0.toFixed(3)} V`,
      };
    }
    case 'ox_solid_red_ion': {
      const c = couples[b.couple!];
      const sol = solids[b.ox_solid!];
      const sn = S_NERNST / c.n;
      const E0p = c.E0 + sn * (sol.z! * PKW - sol.pKsp!);
      return {
        A: E0p - sn * logC, B: sn * sol.z!,
        name: `${sol.species} / ${bare(c.red)}`,
        eq: `${sol.species} + ${sol.z}H⁺ + ${c.n}e⁻ → ${c.red} + ${sol.z}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado de E° y Ksp)`,
      };
    }
    case 'ox_solid_red_metal': {
      const c = couples[b.couple!];
      const sol = solids[b.ox_solid!];
      const sn = S_NERNST / c.n;
      const E0p = c.E0 + sn * (sol.z! * PKW - sol.pKsp!);
      return {
        A: E0p, B: sn * sol.z!,
        name: `${sol.species} / ${bare(c.red)}`,
        eq: `${sol.species} + ${sol.z}H⁺ + ${c.n}e⁻ → ${c.red} + ${sol.z}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
      };
    }
    case 'both_hydroxides': {
      const c = couples[b.couple!];
      const sox = solids[b.ox_solid!];
      const sred = solids[b.red_solid!];
      const dz = sox.z! - sred.z!;
      const sn = S_NERNST / c.n;
      const E0p = c.E0 + sn * (dz * PKW - sox.pKsp! + sred.pKsp!);
      return {
        A: E0p, B: sn * dz,
        name: `${sox.species} / ${sred.species}`,
        eq: `${sox.species} + ${dz}H⁺ + ${c.n}e⁻ → ${sred.species} + ${dz}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
      };
    }
    case 'oxide_solid_hydroxide': {
      const c = couples[b.couple!];
      const sred = solids[b.red_solid!];
      const sn = S_NERNST / c.n;
      const E0p = c.E0 - sn * (sred.z! * PKW - sred.pKsp!);
      return {
        A: E0p, B: sn * ((c.m_H ?? 0) - sred.z!),
        name: `${c.ox} / ${sred.species}`,
        eq: `${c.ox} + ${(c.m_H ?? 0) - sred.z!}H⁺ + ${c.n}e⁻ → ${sred.species}  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
      };
    }
    case 'aqueous_mH': {
      const c = couples[b.couple!];
      const sn = S_NERNST / c.n;
      return {
        A: c.E0, B: sn * (c.m_H ?? 0),
        name: `${bare(c.ox)} / ${bare(c.red)}`,
        eq: `${c.ox} + ${c.m_H}H⁺ + ${c.n}e⁻ → ${c.red} + H₂O  |  E° = ${c.E0.toFixed(3)} V`,
      };
    }
    case 'oxyanion_red_solid': {
      const c = couples[b.couple!];
      const sred = solids[b.red_solid!];
      const sn = S_NERNST / c.n;
      return {
        A: c.E0 - sn * (sred.z! * PKW - sred.pKsp! - logC),
        B: sn * ((c.m_H ?? 0) - sred.z!),
        name: `${bare(c.ox)} / ${sred.species}`,
        eq: `${c.ox} + ${(c.m_H ?? 0) - sred.z!}H⁺ + ${c.n}e⁻ → ${sred.species} + H₂O  |  derivado de E° y Ksp`,
      };
    }
    case 'ion_oxide1': {
      const c = couples[b.couple!];
      const ox1 = solids[b.oxide!];
      const sn = S_NERNST / c.n;
      return {
        A: c.E0 + sn * (logC + ox1.pKd!), B: -sn,
        name: `${bare(c.ox)} / ${ox1.species}`,
        eq: `2${c.ox} + H₂O + ${2 * c.n}e⁻ → ${ox1.species} + 2H⁺  |  derivado de E° y pKd`,
      };
    }
    case 'oxide1_metal': {
      const c = couples[b.couple!];
      const ox1 = solids[b.oxide!];
      const sn = S_NERNST / c.n;
      const A = c.E0 - sn * ox1.pKd!;
      return {
        A, B: sn,
        name: `${ox1.species} / ${bare(c.red)}`,
        eq: `${ox1.species} + 2H⁺ + ${2 * c.n}e⁻ → 2${c.red} + H₂O  |  E°′ = ${A.toFixed(3)} V (derivado)`,
      };
    }
    case 'hydroxide_oxide1': {
      const c = couples[b.couple!];
      const sox = solids[b.ox_solid!];
      const ox1 = solids[b.oxide!];
      const sn = S_NERNST / c.n;
      const A = c.E0 + sn * (sox.z! * PKW - sox.pKsp! + ox1.pKd!);
      return {
        A, B: sn * (sox.z! - 1),
        name: `${sox.species} / ${ox1.species}`,
        eq: `2${sox.species} + 2H⁺ + ${2 * c.n}e⁻ → ${ox1.species} + 3H₂O  |  E°′ = ${A.toFixed(3)} V (derivado)`,
      };
    }
    default:
      throw new Error(`Unknown boundary kind: ${b.kind}`);
  }
}

/** Vertical precipitation boundary: pH = pKw − (pKsp + logC)/z */
function precipitationPH(solid: Solid, logC: number): number {
  const pH = PKW - (solid.pKsp! + logC) / solid.z!;
  return Math.max(0, Math.min(14, pH));
}

function regionPH(rule: (string | number)[], precip: Record<string, number>): number {
  const op = rule[0];
  if (op === 'fixed') return rule[1] as number;
  if (op === 'half') return Math.max(0.6, precip[rule[1] as string] / 2);
  if (op === 'mid') return 0.5 * (precip[rule[1] as string] + precip[rule[2] as string]);
  if (op === 'after') return Math.min(13.5, precip[rule[1] as string] + (rule[2] as number));
  throw new Error(`Unknown region rule: ${rule}`);
}

/** Builds all lines (clipped at triple points) and labels. */
export function buildSystem(systemId: string, logC: number): PourbaixDiagram {
  const sysdef = SYSTEMS[systemId] as SystemDef;
  if (!sysdef || typeof sysdef === 'string') throw new Error(`Unknown system: ${systemId}`);

  const precip: Record<string, number> = {};
  for (const [sid, sol] of Object.entries(sysdef.solids)) {
    if ((sol.type ?? 'hydroxide') === 'hydroxide') precip[sid] = precipitationPH(sol, logC);
  }

  const affine: Record<string, { A: number; B: number; name: string; eq: string }> = {};
  for (const b of sysdef.boundaries) {
    if (b.kind !== 'precipitation') affine[b.id] = affineParams(b, sysdef, logC);
  }

  const intersectionPH = (idA: string, idB: string): number => {
    const a = affine[idA];
    const bb = affine[idB];
    return (a.A - bb.A) / (a.B - bb.B);
  };

  const lines: PourbaixLine[] = [];
  for (const b of sysdef.boundaries) {
    if (b.kind === 'precipitation') {
      const sol = sysdef.solids[b.solid!];
      const pHv = precip[b.solid!];
      let eLo = -2.0;
      let eHi = 3.0;
      if (b.E_min_ref && affine[b.E_min_ref]) {
        const r = affine[b.E_min_ref];
        eLo = r.A - r.B * pHv;
      }
      if (b.E_max_ref && affine[b.E_max_ref]) {
        const r = affine[b.E_max_ref];
        eHi = r.A - r.B * pHv;
      }
      lines.push({
        name: `${sol.ion} / ${sol.species}`,
        pH: [pHv, pHv],
        E: [eLo, eHi],
        color: b.color,
        equation: `${sol.species} ⇌ ${sol.ion} + ${sol.z}OH⁻  |  Ksp = 10^−${sol.pKsp}`,
        vertical: true,
      });
      continue;
    }

    const { A, B, name, eq } = affine[b.id];
    let pHMin = 0;
    let pHMax = 14;
    if (b.clip_min !== undefined) {
      pHMin = typeof b.clip_min === 'string' ? precip[b.clip_min] : intersectionPH(b.id, b.clip_min.line);
    }
    if (b.clip_max !== undefined) {
      pHMax = typeof b.clip_max === 'string' ? precip[b.clip_max] : intersectionPH(b.id, b.clip_max.line);
    }
    pHMin = Math.max(0, pHMin);
    pHMax = Math.min(14, pHMax);
    if (pHMax <= pHMin) continue;

    const N = 60;
    const phArr: number[] = [];
    const eArr: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pH = pHMin + ((pHMax - pHMin) * i) / N;
      phArr.push(pH);
      eArr.push(A - B * pH);
    }
    lines.push({ name, pH: phArr, E: eArr, color: b.color, equation: eq, vertical: false });
  }

  const regions: PourbaixRegion[] = (sysdef.regions ?? []).map((r) => ({
    name: r.name,
    color: r.color,
    labelPH: regionPH(r.pH, precip),
    labelE: r.E,
  }));

  return {
    lines,
    regions,
    name: sysdef.name,
    note: sysdef.note ?? '',
    excluded: sysdef.excluded_species ?? [],
  };
}

/** Water stability lines (Pourbaix lines a and b), to be drawn as dashed lines. */
export function waterLines(): { o2: { A: number; B: number }; h2: { A: number; B: number } } {
  return {
    o2: { A: 1.229, B: S_NERNST }, // O₂ + 4H⁺ + 4e⁻ → 2H₂O
    h2: { A: 0, B: S_NERNST },     // 2H⁺ + 2e⁻ → H₂
  };
}

// ─── Arbitrary Pourbaix (N couples + N solids) ────────────────────────────────

export interface ArbIon {
  kind: 'ion';
  formula: string;
  /** Charge number (positive) */
  z: number;
}
export interface ArbHydrox {
  kind: 'hydroxide';
  formula: string;
  z: number;
  pKsp: number;
  /** Formula of the dissolved ion this solid precipitates from */
  ionRef: string;
}
export interface ArbMetal {
  kind: 'metal';
  formula: string;
}
export type ArbSpecies = ArbIon | ArbHydrox | ArbMetal;

export interface ArbCouple {
  /** Formula of oxidized species (must be an ion) */
  ox: string;
  /** Formula of reduced species (ion or metal) */
  red: string;
  E0: number;
  n: number;
  /** H⁺ stoichiometry (for couples that consume protons) */
  mH?: number;
}

/**
 * Builds a Pourbaix diagram from an arbitrary set of species and redox couples.
 * Only the fundamental couples (aqueous ion/ion or ion/metal) need to be supplied;
 * all solid-phase boundaries are auto-derived via Hess's law.
 * Clipping uses precipitation pHs as natural boundary limits.
 */
export function buildArbitraryDiagram(
  species: ArbSpecies[],
  couples: ArbCouple[],
  logC: number,
): PourbaixDiagram {
  const S = S_NERNST;

  const byFormula = new Map<string, ArbSpecies>();
  for (const sp of species) byFormula.set(sp.formula, sp);

  const metals = species.filter((s): s is ArbMetal => s.kind === 'metal');

  // pH where each hydroxide solid starts to precipitate
  const precipPH = new Map<string, number>();
  for (const sp of species) {
    if (sp.kind === 'hydroxide') {
      const pH = PKW - (sp.pKsp + logC) / sp.z;
      precipPH.set(sp.formula, Math.max(0, Math.min(14, pH)));
    }
  }

  // Map dissolved ion formula → its hydroxide solid
  const ionToSolid = new Map<string, ArbHydrox>();
  for (const sp of species) {
    if (sp.kind === 'hydroxide') ionToSolid.set(sp.ionRef, sp);
  }

  interface AffineEntry {
    name: string;
    A: number;
    B: number;
    color: string;
    eq: string;
    pHMin: number;
    pHMax: number;
  }
  const affines: AffineEntry[] = [];

  for (const c of couples) {
    const oxSp = byFormula.get(c.ox);
    const redSp = byFormula.get(c.red);
    if (!oxSp || !redSp || oxSp.kind !== 'ion') continue;

    const H_ox = ionToSolid.get(c.ox);
    const sn = S / c.n;

    if (redSp.kind === 'metal') {
      const clipMax = H_ox ? (precipPH.get(H_ox.formula) ?? 14) : 14;

      // Deposition: M^n+ + n·e⁻ → M(s)   E = E0 + (S/n)·logC
      affines.push({
        name: `${c.ox} / ${redSp.formula}`,
        A: c.E0 + sn * logC, B: 0,
        color: '#0072B2',
        eq: `${c.ox} + ${c.n}e⁻ → ${redSp.formula}  |  E° = ${c.E0.toFixed(3)} V`,
        pHMin: 0, pHMax: clipMax,
      });

      // Solid/metal: M(OH)z + z·H⁺ + n·e⁻ → M(s) + z·H₂O
      if (H_ox) {
        const E0p = c.E0 + sn * (H_ox.z * PKW - H_ox.pKsp);
        affines.push({
          name: `${H_ox.formula} / ${redSp.formula}`,
          A: E0p, B: sn * H_ox.z,
          color: '#009E73',
          eq: `${H_ox.formula} + ${H_ox.z}H⁺ + ${c.n}e⁻ → ${redSp.formula} + ${H_ox.z}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
          pHMin: precipPH.get(H_ox.formula) ?? 0, pHMax: 14,
        });
      }
    } else if (redSp.kind === 'ion') {
      const H_red = ionToSolid.get(c.red);
      const mH = c.mH ?? 0;

      // Aqueous redox: both species dissolved
      const aqMax = Math.min(
        H_ox ? (precipPH.get(H_ox.formula) ?? 14) : 14,
        H_red ? (precipPH.get(H_red.formula) ?? 14) : 14,
      );
      affines.push({
        name: `${c.ox} / ${c.red}`,
        A: c.E0, B: sn * mH,
        color: '#0072B2',
        eq: mH === 0
          ? `${c.ox} + ${c.n}e⁻ → ${c.red}  |  E° = ${c.E0.toFixed(3)} V`
          : `${c.ox} + ${mH}H⁺ + ${c.n}e⁻ → ${c.red} + H₂O  |  E° = ${c.E0.toFixed(3)} V`,
        pHMin: 0, pHMax: aqMax,
      });

      // ox_solid_red_ion: H_ox solid, red ion still dissolved
      if (H_ox) {
        const E0p = c.E0 + sn * (H_ox.z * PKW - H_ox.pKsp);
        affines.push({
          name: `${H_ox.formula} / ${c.red}`,
          A: E0p - sn * logC, B: sn * H_ox.z,
          color: '#CC79A7',
          eq: `${H_ox.formula} + ${H_ox.z}H⁺ + ${c.n}e⁻ → ${c.red} + ${H_ox.z}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
          pHMin: precipPH.get(H_ox.formula) ?? 0,
          pHMax: H_red ? (precipPH.get(H_red.formula) ?? 14) : 14,
        });
      }

      // both_hydroxides: both ions have precipitated as solids
      if (H_ox && H_red) {
        const dz = H_ox.z - H_red.z;
        const E0p = c.E0 + sn * (dz * PKW - H_ox.pKsp + H_red.pKsp);
        const pHMin = Math.max(
          precipPH.get(H_ox.formula) ?? 0,
          precipPH.get(H_red.formula) ?? 0,
        );
        affines.push({
          name: `${H_ox.formula} / ${H_red.formula}`,
          A: E0p, B: sn * dz,
          color: '#E69F00',
          eq: `${H_ox.formula} + ${dz}H⁺ + ${c.n}e⁻ → ${H_red.formula} + ${dz}H₂O  |  E°′ = ${E0p.toFixed(3)} V (derivado)`,
          pHMin, pHMax: 14,
        });
      }

      // oxyanion_red_solid (unusual): ox ion stable, red precipitates first
      if (!H_ox && H_red) {
        const E0p = c.E0 - sn * (H_red.z * PKW - H_red.pKsp - logC);
        affines.push({
          name: `${c.ox} / ${H_red.formula}`,
          A: E0p, B: sn * (mH - H_red.z),
          color: '#56B4E9',
          eq: `${c.ox} + ${mH - H_red.z}H⁺ + ${c.n}e⁻ → ${H_red.formula} + H₂O  |  derivado`,
          pHMin: precipPH.get(H_red.formula) ?? 0, pHMax: 14,
        });
      }
    }
  }

  // Render non-vertical boundary lines
  const NPTS = 60;
  const lines: PourbaixLine[] = [];
  for (const a of affines) {
    const p0 = Math.max(0, a.pHMin);
    const p1 = Math.min(14, a.pHMax);
    if (p1 <= p0) continue;
    const phArr: number[] = [];
    const eArr: number[] = [];
    for (let i = 0; i <= NPTS; i++) {
      const pH = p0 + ((p1 - p0) * i) / NPTS;
      phArr.push(pH);
      eArr.push(a.A - a.B * pH);
    }
    lines.push({ name: a.name, pH: phArr, E: eArr, color: a.color, equation: a.eq, vertical: false });
  }

  // Render precipitation vertical lines
  for (const sp of species) {
    if (sp.kind !== 'hydroxide') continue;
    const pHv = precipPH.get(sp.formula) ?? 0;
    if (pHv <= 0 || pHv >= 14) continue;

    // eLo: E of the solid/metal (or solid/ion) boundary at pHv → bottom of vertical
    // eHi: E of the deposition boundary at pHv → top of vertical
    let eLo = -1.6;
    let eHi = 2.2;
    for (const a of affines) {
      const Eat = a.A - a.B * pHv;
      if (a.name.startsWith(sp.formula + ' /')) {
        eLo = Math.max(eLo, Eat);
      }
      if (
        (a.name.startsWith(sp.ionRef + ' /') || a.name === `${sp.ionRef} / ${sp.formula}`) &&
        Math.abs(a.B) < 1e-9
      ) {
        eHi = Math.min(eHi, Eat);
      }
    }

    lines.push({
      name: `${sp.ionRef} / ${sp.formula}`,
      pH: [pHv, pHv],
      E: [eLo, eHi],
      color: '#D55E00',
      equation: `${sp.formula} ⇌ ${sp.ionRef} + ${sp.z}OH⁻  |  Ksp = 10^−${sp.pKsp}`,
      vertical: true,
    });
  }

  // Auto-place region labels (approximate)
  const regions: PourbaixRegion[] = [];
  const solidsSorted = species
    .filter((s): s is ArbHydrox => s.kind === 'hydroxide')
    .sort((a, b) => (precipPH.get(a.formula) ?? 0) - (precipPH.get(b.formula) ?? 0));

  for (const sp of species) {
    if (sp.kind !== 'ion') continue;
    const H = ionToSolid.get(sp.formula);
    const pHright = H ? (precipPH.get(H.formula) ?? 14) : 14;
    // Place label at 70 % of the ion's domain so the cursor reads the correct species
    // even when positioned near the right edge of the ionic region (close to precipPH).
    const labelPH = Math.max(0.5, pHright * 0.7);
    // E label: above the highest boundary ending at this ion as red
    let labelE = 0.4;
    for (const a of affines) {
      if (a.pHMin <= labelPH && labelPH <= a.pHMax) {
        const Eat = a.A - a.B * labelPH;
        if (a.name.endsWith('/ ' + sp.formula)) {
          labelE = Math.max(labelE, Eat + 0.25);
        }
      }
    }
    regions.push({ name: sp.formula, color: '#2c3e50', labelPH, labelE });
  }

  for (let i = 0; i < solidsSorted.length; i++) {
    const sp = solidsSorted[i];
    const pHstart = precipPH.get(sp.formula) ?? 0;
    const nextPrecip = solidsSorted[i + 1] ? (precipPH.get(solidsSorted[i + 1].formula) ?? 14) : 14;
    const labelPH = (pHstart + nextPrecip) / 2;
    let labelE = -0.3;
    for (const a of affines) {
      if (a.name.startsWith(sp.formula + ' /') && a.pHMin <= labelPH && labelPH <= a.pHMax) {
        const Eat = a.A - a.B * labelPH;
        labelE = Math.max(labelE, Eat + 0.18);
      }
    }
    regions.push({ name: sp.formula, color: '#2c3e50', labelPH, labelE });
  }

  for (const sp of metals) {
    const lastPrecip = solidsSorted.length > 0
      ? (precipPH.get(solidsSorted[solidsSorted.length - 1].formula) ?? 7)
      : 7;
    regions.push({
      name: `${sp.formula}(s)`,
      color: '#2c3e50',
      labelPH: (lastPrecip + 14) / 2,
      labelE: -0.9,
    });
  }

  return { lines, regions, name: 'Sistema personalizado', note: '', excluded: [] };
}

/**
 * Converts a preset SystemDef into an ArbitraryCustom seed for custom mode's
 * "edit this system" entry point. Lossless for hydroxide-only systems (Fe, Zn,
 * Ni, Cr): ArbSpecies has no equivalent for a solid formed by disproportionation
 * (pKd, e.g. Cu₂O) or referenced bare as a couple's oxidized form with no
 * dissolution model (e.g. MnO₂, PbO₂ — recognized by lacking the charge suffix
 * every genuine ion/metal formula in this dataset carries) — those solids/couples
 * are dropped and reported via `warnings` rather than silently producing a wrong
 * diagram. A hydroxide-typed solid missing z/pKsp/ion (malformed preset data)
 * is dropped the same way rather than pushing NaN into the diagram.
 */
export function presetToArbitrary(sys: SystemDef): { arb: { species: ArbSpecies[]; couples: ArbCouple[] }; warnings: string[] } {
  const warnings: string[] = [];
  const hasCharge = (f: string) => /[⁺⁻]$/.test(f);
  const isMetalFormula = (f: string) => f.endsWith('(s)');
  const bare = (f: string) => f.replace('(s)', '');

  const ionZ = new Map<string, number>();
  for (const sol of Object.values(sys.solids)) {
    if (sol.ion && sol.z !== undefined) ionZ.set(sol.ion, sol.z);
  }

  const ions = new Map<string, ArbIon>();
  const metals = new Map<string, ArbMetal>();
  const couples: ArbCouple[] = [];

  for (const c of Object.values(sys.couples)) {
    if (!hasCharge(c.ox) || !(hasCharge(c.red) || isMetalFormula(c.red))) {
      warnings.push(`${c.ox} → ${bare(c.red)} (sin modelo de disolución)`);
      continue;
    }
    if (!ions.has(c.ox)) ions.set(c.ox, { kind: 'ion', formula: c.ox, z: ionZ.get(c.ox) ?? chargeMagnitude(c.ox) });
    if (isMetalFormula(c.red)) {
      const f = bare(c.red);
      if (!metals.has(f)) metals.set(f, { kind: 'metal', formula: f });
    } else if (!ions.has(c.red)) {
      ions.set(c.red, { kind: 'ion', formula: c.red, z: ionZ.get(c.red) ?? chargeMagnitude(c.red) });
    }
    couples.push({ ox: c.ox, red: bare(c.red), E0: c.E0, n: c.n, mH: c.m_H });
  }

  const hydroxides: ArbHydrox[] = [];
  for (const sol of Object.values(sys.solids)) {
    const type = sol.type ?? 'hydroxide';
    if (type !== 'hydroxide') {
      warnings.push(`${sol.species} (tipo "${type}", sin disolución custom)`);
      continue;
    }
    if (sol.z === undefined || sol.pKsp === undefined || !sol.ion) {
      warnings.push(`${sol.species} (datos incompletos)`);
      continue;
    }
    hydroxides.push({ kind: 'hydroxide', formula: sol.species, z: sol.z, pKsp: sol.pKsp, ionRef: sol.ion });
  }

  return {
    arb: { species: [...ions.values(), ...hydroxides, ...metals.values()], couples },
    warnings,
  };
}
