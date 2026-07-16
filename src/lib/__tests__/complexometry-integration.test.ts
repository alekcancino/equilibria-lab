import { describe, it, expect } from 'vitest';
import {
  freeLigandConcentration,
  condLogKPrimary,
  sideStackFromEditor,
  defaultSideEditorState,
  hydroxideSolCurveMasked,
  logSThresholdFromConcentration,
  distributionCoefficient,
  resinExchangeFraction,
  alphaComplex,
} from '../sideReactions';
import { edtaAtFraction } from '../edta';

const tol = (val: number, expected: number, delta = 0.2) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

/** Zn–EDTA–NH₃ stack (2 M total auxiliary) without complex protonation. */
function znAuxStack() {
  const side = defaultSideEditorState();
  side.ligandPKas = [2.0, 2.69, 6.13, 10.37, 13.1, 13.5];
  side.showAux = true;
  side.auxSpecMode = 'total';
  side.cAuxTotal = 2.0;
  side.auxPKas = [9.2];
  side.logBetasAux = [2.21, 4.5, 6.86, 8.89];
  return sideStackFromEditor(side);
}

function znOhAuxStack() {
  const side = defaultSideEditorState();
  side.ligandPKas = [2.0, 2.69, 6.13, 10.37, 13.1, 13.5];
  side.showOH = true;
  side.logBetasOH = [5.04, 10.43, 13.7, 15.2];
  side.showAux = true;
  side.auxSpecMode = 'total';
  side.cAuxTotal = 2.0;
  side.auxPKas = [9.2];
  side.logBetasAux = [2.21, 4.5, 6.86, 8.89];
  return sideStackFromEditor(side);
}

function znFullStack(): ReturnType<typeof sideStackFromEditor> {
  return {
    ...znOhAuxStack(),
    complex: { logBetaProtonation: 19.44, logBetaHydroxy: 4.54 },
  };
}

describe('NH₃ masking — free ligand concentration', () => {
  it('[NH₃] free from 2 M total and pKa 9.2 at pH 10', () => {
    const c = freeLigandConcentration(
      { mode: 'total', cTotal: 2.0, pKas: [9.2] },
      10,
    );
    expect(c).toBeGreaterThan(1.5);
    expect(c).toBeLessThan(2.0);
  });

  it('[NH₃] free drops as pH decreases (more NH₄⁺ formed)', () => {
    const cHigh = freeLigandConcentration({ mode: 'total', cTotal: 2.0, pKas: [9.2] }, 10);
    const cLow = freeLigandConcentration({ mode: 'total', cTotal: 2.0, pKas: [9.2] }, 6.5);
    expect(cHigh).toBeGreaterThan(cLow);
  });
});

describe('Zn–EDTA — conditional log K′ vs pH', () => {
  const logKf = 16.44;

  it('NH₃ 2 M reduces log K′ vs bare system at pH 6.5', () => {
    const bare = sideStackFromEditor(defaultSideEditorState());
    const withAux = znAuxStack();
    const lkBare = condLogKPrimary(logKf, 6.5, bare);
    const lkAux = condLogKPrimary(logKf, 6.5, withAux);
    expect(lkBare).toBeGreaterThan(lkAux);
  });

  it('ligand protonation dominates the corrected additive branches at pH 6.5', () => {
    const stack = znOhAuxStack();
    const lk65 = condLogKPrimary(logKf, 6.5, stack);
    const lk10 = condLogKPrimary(logKf, 10, stack);
    expect(lk10).toBeGreaterThan(lk65);
  });

  it('complex protonation of MY increases α_MY at acidic pH', () => {
    const a = alphaComplex(6.5, { logBetaProtonation: 19.44 });
    expect(a).toBeGreaterThan(1e6);
  });
});

describe('Zn(OH)₂ conditional solubility with NH₃ masking', () => {
  it('solubility threshold from C = 0.01 M', () => {
    tol(logSThresholdFromConcentration(0.01), -2, 0.01);
  });

  it('NH₃ 2 M raises log s vs hydroxide-only at pH 10', () => {
    const stackOH = sideStackFromEditor({
      ...defaultSideEditorState(),
      showOH: true,
      logBetasOH: [5.04, 10.43, 13.7, 15.2],
    });
    const stackOHaux = znFullStack();
    const { logS, pHs } = hydroxideSolCurveMasked(11.38, 2, stackOHaux, [0, 14], 200);
    const idx10 = pHs.findIndex((p) => Math.abs(p - 10) < 0.1);
    const bare = hydroxideSolCurveMasked(11.38, 2, stackOH, [0, 14], 200);
    expect(logS[idx10]).toBeGreaterThan(bare.logS[idx10]);
  });
});

describe('EDTA complexometric titration (pY′ and pM′)', () => {
  const side = defaultSideEditorState();
  side.showAux = true;
  side.auxSpecMode = 'total';
  side.cAuxTotal = 2.0;
  side.auxPKas = [9.2];
  side.logBetasAux = [2.21, 4.5, 6.86, 8.89];

  it('pY′ at 50 % and pM′ at 150 % are finite', () => {
    const at50 = edtaAtFraction({
      logKf: 16.44, pH: 10, cMetal: 0.01, sideEditor: side,
    }, 0.5);
    const at150 = edtaAtFraction({
      logKf: 16.44, pH: 10, cMetal: 0.01, sideEditor: side,
    }, 1.5);
    expect(at50.pY).toBeGreaterThan(0);
    expect(at150.pM).toBeGreaterThan(0);
    expect(at50.pY).toBeLessThan(20);
  });

  it('pM′ increases past the equivalence point (x = 1.5, EDTA excess)', () => {
    const atEq = edtaAtFraction({ logKf: 16.44, pH: 10, cMetal: 0.01, sideEditor: side }, 1.0);
    const at150 = edtaAtFraction({ logKf: 16.44, pH: 10, cMetal: 0.01, sideEditor: side }, 1.5);
    expect(at150.pM).toBeGreaterThan(atEq.pM);
  });
});

describe('Ion exchange — distribution coefficient D vs pH', () => {
  it('D increases as bulk H+ falls relative to resin H+', () => {
    const stack = sideStackFromEditor({
      ...defaultSideEditorState(),
      showOH: true,
      logBetasOH: [4.97, 8.55],
    });
    const d4 = distributionCoefficient({ kSelSquared: 3, pH: 4, stack, hResin: 0.005 });
    const d8 = distributionCoefficient({ kSelSquared: 3, pH: 8, stack, hResin: 0.005 });
    expect(d8).toBeGreaterThan(d4);
  });

  it('resin exchange fraction φ is between 0 and 1', () => {
    const stack = sideStackFromEditor({
      ...defaultSideEditorState(),
      showOH: true,
      logBetasOH: [4.97, 8.55],
    });
    const d = distributionCoefficient({ kSelSquared: 3, pH: 4, stack, hResin: 0.005 });
    const phi = resinExchangeFraction({
      d,
      r: 1 / 0.2,
      capacityFactorMeqPerL: (5 * 1) / 0.2,
    });
    expect(phi).toBeGreaterThan(0);
    expect(phi).toBeLessThan(1);
  });
});
