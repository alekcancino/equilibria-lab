import { describe, expect, it } from 'vitest';
import { tracesToCSV } from '../export';

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
