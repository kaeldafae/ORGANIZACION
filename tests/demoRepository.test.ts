import { describe, expect, it } from 'vitest';
import { DemoRepository } from '../src/data/demoRepository';
import { parsearSeguimiento } from '../src/domain/seguimiento';

const ahora = new Date('2026-10-08T12:00:00Z');
const repo = () => new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });

describe('DemoRepository', () => {
  it('trae unas 30 incidencias repartidas entre áreas, estados y prioridades', async () => {
    const r = repo();
    const abiertas = await r.abiertas();
    const resueltas = await r.resueltasDesde(new Date(0).toISOString());
    const recientes = [...abiertas, ...resueltas].filter((i) => Number(i.id) < 100);
    expect(recientes).toHaveLength(30);
    expect(new Set(recientes.map((i) => i.area)).size).toBe(4);
    expect(new Set(recientes.map((i) => i.estado)).size).toBe(3);
    expect(new Set(recientes.map((i) => i.prioridad)).size).toBe(3);
  });

  it('crea, mueve y resuelve fijando la fecha de resolución', async () => {
    const r = repo();
    const nueva = await r.crear({
      titulo: 'Prueba',
      area: 'Botones',
      tipo: 'Incidencia',
      prioridad: 'Normal',
      turno: 'Mañana',
      habitacion: '',
      descripcion: '',
      asignadoId: '2',
    });
    expect(nueva.estado).toBe('Pendiente');
    expect(nueva.asignado?.nombre).toBe('Javier Ortega');
    const resuelta = await r.actualizar(nueva.id, { estado: 'Resuelto' });
    expect(resuelta.fechaResolucion).toBe(ahora.toISOString());
    const reabierta = await r.actualizar(nueva.id, { estado: 'Pendiente' });
    expect(reabierta.fechaResolucion).toBeNull();
  });

  it('añade notas de seguimiento', async () => {
    const r = repo();
    const inc = await r.anadirNota('1', 'Revisado', 'Lucía Martín');
    expect(parsearSeguimiento(inc.seguimiento).at(-1)).toMatchObject({
      autor: 'Lucía Martín',
      texto: 'Revisado',
    });
  });

  it('pagina el historial', async () => {
    const r = repo();
    const p1 = await r.historial(null);
    expect(p1.elementos).toHaveLength(25);
    expect(p1.siguiente).not.toBeNull();
    const p2 = await r.historial(p1.siguiente);
    expect((p2.elementos[0]?.modificado ?? '') <= (p1.elementos.at(-1)?.modificado ?? '')).toBe(
      true,
    );
  });

  it('da error claro si la incidencia no existe', async () => {
    await expect(repo().obtener('nope')).rejects.toMatchObject({ tipo: 'no-encontrado' });
  });
});
