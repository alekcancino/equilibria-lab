import { describe, expect, it } from 'vitest';
import { tracesToCSV, gridToCSV } from '../export';
import { predominanceGrid } from '../predominance2D';

describe('tracesToCSV', () => {
  it('genera header y filas para dos trazas', () => {
    const data = [
      { name: 'A', x: [1, 2], y: [10, 20] },
      { name: 'B', x: [1, 2], y: [30, 40] },
    ];
    const csv = tracesToCSV(data as never, 'pH', 'log C');
    const rows = csv.split('\n');
    expect(rows[0]).toBe('pH:A,log C:A,pH:B,log C:B');
    expect(rows[1]).toBe('1,10,1,30');
    expect(rows[2]).toBe('2,20,2,40');
  });

  it('rellena con celdas vacías cuando las trazas tienen diferente longitud', () => {
    const data = [
      { name: 'corta', x: [1], y: [5] },
      { name: 'larga', x: [1, 2, 3], y: [10, 20, 30] },
    ];
    const csv = tracesToCSV(data as never, 'x', 'y');
    const rows = csv.split('\n');
    expect(rows).toHaveLength(4);
    expect(rows[2]).toBe(',,2,20');
    expect(rows[3]).toBe(',,3,30');
  });

  it('devuelve string vacío si no hay trazas válidas', () => {
    expect(tracesToCSV([], 'x', 'y')).toBe('');
    expect(tracesToCSV([{ type: 'scatter' } as never], 'x', 'y')).toBe('');
  });

  it('escapa comas en el nombre de la traza', () => {
    const data = [{ name: 'Ca,Mg', x: [1], y: [2] }];
    const csv = tracesToCSV(data as never, 'pH', 's');
    expect(csv.split('\n')[0]).toBe('pH:Ca;Mg,s:Ca;Mg');
  });

  it('antepone metadatos como líneas de comentario', () => {
    const data = [{ name: 'A', x: [1], y: [2] }];
    const meta = { Módulo: 'AcidoBase', 'C / M': '0.01' };
    const csv = tracesToCSV(data as never, 'pH', 'α', meta);
    const rows = csv.split('\n');
    expect(rows[0]).toBe('# Módulo: AcidoBase');
    expect(rows[1]).toBe('# C / M: 0.01');
    expect(rows[2]).toBe('pH:A,α:A');
    expect(rows[3]).toBe('1,2');
  });

  it('sin metadatos el output es el mismo que antes', () => {
    const data = [{ name: 'A', x: [1], y: [2] }];
    expect(tracesToCSV(data as never, 'pH', 'α')).toBe('pH:A,α:A\n1,2');
  });
});

describe('gridToCSV', () => {
  // species 1 wins iff x+y>0, else species 0 — same trivial system used in predominance2D.test.ts.
  const fracAt = (x: number, y: number): number[] => (x + y > 0 ? [0, 1] : [1, 0]);
  const labels = ['Libre', 'Complejo'];

  it('header row: corner label + one column per x sample', () => {
    const grid = predominanceGrid(fracAt, [0, 2], [0, 1], 3, 2);
    const csv = gridToCSV(grid, labels, 'pH', 'pL');
    const rows = csv.split('\n');
    expect(rows[0]).toBe('pL \\ pH,0.000,1.000,2.000');
  });

  it('rows are emitted highest-y-first, first cell is the y value', () => {
    const grid = predominanceGrid(fracAt, [0, 2], [0, 1], 3, 2);
    const csv = gridToCSV(grid, labels, 'pH', 'pL');
    const rows = csv.split('\n');
    expect(rows[1].startsWith('1.000,')).toBe(true); // y=1 (top) first
    expect(rows[2].startsWith('0.000,')).toBe(true); // y=0 (bottom) last
  });

  it('cells hold the dominant species NAME, matching the fraction rule', () => {
    const grid = predominanceGrid(fracAt, [-1, 1], [-1, 1], 3, 3);
    const csv = gridToCSV(grid, labels, 'x', 'y');
    const rows = csv.split('\n');
    // top row (y=1): x=-1→0 (Libre), x=0→0+1=1>0 (Complejo), x=1→1+1=2>0 (Complejo)
    expect(rows[1]).toBe('1.000,Libre,Complejo,Complejo');
    // bottom row (y=-1): x=-1→-2 (Libre), x=0→-1 (Libre), x=1→0 tie→lower index (Libre)
    expect(rows[3]).toBe('-1.000,Libre,Libre,Libre');
  });

  it('prepends metadata as comment lines, same convention as tracesToCSV', () => {
    const grid = predominanceGrid(fracAt, [0, 1], [0, 1], 2, 2);
    const csv = gridToCSV(grid, labels, 'pH', 'pL', { Módulo: 'Especiación' });
    const rows = csv.split('\n');
    expect(rows[0]).toBe('# Módulo: Especiación');
    expect(rows[1]).toBe('pL \\ pH,0.000,1.000');
  });

  it('marks no-solution cells (dominant index −1) as an empty cell, not a stray label', () => {
    const noSolution = (): number[] => [NaN, NaN];
    const grid = predominanceGrid(noSolution, [0, 1], [0, 1], 2, 2);
    const csv = gridToCSV(grid, labels, 'x', 'y');
    const rows = csv.split('\n');
    expect(rows[1]).toBe('1.000,,');
  });
});
