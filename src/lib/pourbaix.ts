// Data-driven Pourbaix diagram generator.
// Direct port of pourbaix_core.py (EquilibriaLab, audited): only E° and pKsp
// are primitive data; every solid-boundary potential is DERIVED via Hess's law,
// so triple-point closure is a mathematical identity, not a coincidence (lesson from audit P0-4).
//
// Golden-suite identities verified against the original project:
//   Fe(OH)₃/Fe²⁺ E°′ = 0.948 V · Fe(OH)₃/Fe(OH)₂ = 0.179 V · Fe(OH)₂/Fe = −0.056 V
//   Cu(OH)₂/Cu = 0.588 V · Zn(OH)₂/Zn = −0.437 V · Cr(OH)₃/Cr = −0.507 V
//   MnO₂/Mn(OH)₂ = 0.784 V · Mn(OH)₂/Mn = −0.735 V

import SYSTEMS_RAW from './pourbaixSystems.json';
import { NERNST_S, PKW } from './constants';

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
