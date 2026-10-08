import { describe, expect, it } from 'vitest';
import type { Incidencia } from '../src/domain/tipos';
import {
  agruparPorArea,
  aplicarFiltros,
  ordenarPorPrioridad,
  siguienteEstado,
  type FiltroRapido,
} from '../src/domain/filtros';
import { FLUJO_ESTADOS } from '../src/domain/valores';

const ahora = new Date('2026-10-08T12:00:00Z');
const ctx = { personaId: '1', ahora, zona: 'Europe/Madrid' };

function inc(p: Partial<Incidencia>): Incidencia {
  return {
    id: '1',
    etag: null,
    titulo: 'Algo',
    area: 'Recepción',
    tipo: 'Incidencia',
    prioridad: 'Normal',
    turno: 'Mañana',
    habitacion: '',
    descripcion: '',
    estado: 'Pendiente',
    asignado: null,
    seguimiento: '',
    fechaResolucion: null,
    creado: '2026-10-08T08:00:00Z',
    modificado: '2026-10-08T08:00:00Z',
    autor: '',
    editor: '',
    ...p,
  };
}

const lista = [
  inc({ id: 'a', titulo: 'Aire acondicionado', habitacion: '214', prioridad: 'Urgente' }),
  inc({ id: 'b', asignado: { id: '1', nombre: 'Yo', email: '' }, creado: '2026-10-05T08:00:00Z' }),
  inc({ id: 'c', tipo: 'Nota para reunión', descripcion: 'Revisar CAMIÓN de lavandería' }),
];

const ids = (xs: Incidencia[]) => xs.map((x) => x.id);
const f = (...xs: FiltroRapido[]) => new Set(xs);

describe('filtros', () => {
  it('sin filtros devuelve todo', () => {
    expect(ids(aplicarFiltros(lista, f(), '', ctx))).toEqual(['a', 'b', 'c']);
  });

  it('filtra mis asignadas, urgentes, hoy y reunión', () => {
    expect(ids(aplicarFiltros(lista, f('mias'), '', ctx))).toEqual(['b']);
    expect(ids(aplicarFiltros(lista, f('urgentes'), '', ctx))).toEqual(['a']);
    expect(ids(aplicarFiltros(lista, f('hoy'), '', ctx))).toEqual(['a', 'c']);
    expect(ids(aplicarFiltros(lista, f('reunion'), '', ctx))).toEqual(['c']);
  });

  it('combina filtros (deben cumplirse todos)', () => {
    expect(ids(aplicarFiltros(lista, f('hoy', 'urgentes'), '', ctx))).toEqual(['a']);
    expect(ids(aplicarFiltros(lista, f('mias', 'urgentes'), '', ctx))).toEqual([]);
  });

  it('"mis asignadas" no muestra nada si no se conoce al usuario', () => {
    expect(aplicarFiltros(lista, f('mias'), '', { ...ctx, personaId: null })).toEqual([]);
  });

  it('busca en título, habitación y descripción sin tildes ni mayúsculas', () => {
    expect(ids(aplicarFiltros(lista, f(), 'aire', ctx))).toEqual(['a']);
    expect(ids(aplicarFiltros(lista, f(), '214', ctx))).toEqual(['a']);
    expect(ids(aplicarFiltros(lista, f(), 'camion', ctx))).toEqual(['c']);
  });

  it('ordena urgentes primero y luego lo más reciente', () => {
    const orden = [
      inc({ id: 'vieja', prioridad: 'Urgente', creado: '2026-10-01T00:00:00Z' }),
      inc({ id: 'baja', prioridad: 'Baja', creado: '2026-10-08T00:00:00Z' }),
      inc({ id: 'nueva', prioridad: 'Urgente', creado: '2026-10-08T00:00:00Z' }),
    ].sort(ordenarPorPrioridad);
    expect(ids(orden)).toEqual(['nueva', 'vieja', 'baja']);
  });

  it('agrupa por área conservando las áreas vacías', () => {
    const g = agruparPorArea(lista, ['Mayordomía', 'Recepción']);
    expect(g.get('Mayordomía')).toEqual([]);
    expect(g.get('Recepción')?.length).toBe(3);
  });

  it('calcula el siguiente estado del flujo', () => {
    expect(siguienteEstado('Pendiente', FLUJO_ESTADOS)).toBe('En curso');
    expect(siguienteEstado('En curso', FLUJO_ESTADOS)).toBe('Resuelto');
    expect(siguienteEstado('Resuelto', FLUJO_ESTADOS)).toBeNull();
  });
});
