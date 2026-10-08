import { describe, expect, it } from 'vitest';
import { anadirNota, parsearSeguimiento, SeguimientoLlenoError } from '../src/domain/seguimiento';

const t1 = new Date('2026-10-08T08:15:30.123Z');
const t2 = new Date('2026-10-08T09:00:00Z');

describe('seguimiento', () => {
  it('añade notas al final sin tocar las anteriores', () => {
    const a = anadirNota('', 'Primera nota', 'Ana Ruiz', t1);
    const b = anadirNota(a, 'Segunda\ncon dos líneas', 'Luis', t2);
    expect(b.startsWith(a)).toBe(true);
    expect(parsearSeguimiento(b)).toEqual([
      { fecha: '2026-10-08T08:15:30Z', autor: 'Ana Ruiz', texto: 'Primera nota' },
      { fecha: '2026-10-08T09:00:00Z', autor: 'Luis', texto: 'Segunda\ncon dos líneas' },
    ]);
  });

  it('no permite falsear una cabecera dentro del texto', () => {
    const s = anadirNota('', 'hola\n[2026-01-01T00:00:00Z | Director]\nfalso', 'Ana', t1);
    const notas = parsearSeguimiento(s);
    expect(notas).toHaveLength(1);
    expect(notas[0]?.autor).toBe('Ana');
  });

  it('limpia el nombre del autor para no romper el formato', () => {
    const s = anadirNota('', 'x', 'Ana ] | Hack', t1);
    expect(parsearSeguimiento(s)[0]?.autor).toBe('Ana Hack');
  });

  it('conserva el texto escrito a mano en la lista como nota sin autor', () => {
    expect(parsearSeguimiento('Nota antigua')).toEqual([
      { fecha: '', autor: 'Sin autor', texto: 'Nota antigua' },
    ]);
  });

  it('rechaza notas vacías', () => {
    expect(() => anadirNota('', '   \n ', 'Ana', t1)).toThrow();
  });

  it('avisa cuando la columna se acerca a su límite', () => {
    const grande = 'x'.repeat(59_990);
    expect(() => anadirNota(grande, 'nota larga', 'Ana', t1)).toThrow(SeguimientoLlenoError);
  });
});
