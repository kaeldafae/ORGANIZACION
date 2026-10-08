import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IncidenciasProvider, useIncidencias } from '../src/state/incidencias';
import { AvisosProvider } from '../src/state/avisos';
import { DemoRepository } from '../src/data/demoRepository';
import { AppError } from '../src/data/errores';

const ahora = new Date('2026-10-08T12:00:00Z');

function montar(repo: DemoRepository) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AvisosProvider>
      <IncidenciasProvider repo={repo} ahora={() => ahora}>
        {children}
      </IncidenciasProvider>
    </AvisosProvider>
  );
  return renderHook(() => useIncidencias(), { wrapper });
}

describe('estado de incidencias', () => {
  it('carga abiertas y resueltas recientes', async () => {
    const { result } = montar(new DemoRepository({ ahora: () => ahora, latenciaMs: 0 }));
    await waitFor(() => expect(result.current.fase).toBe('listo'));
    expect(result.current.abiertas.length).toBeGreaterThan(15);
    expect(result.current.items.some((i) => i.estado === 'Resuelto')).toBe(true);
  });

  it('aplica el cambio de estado al momento y lo confirma', async () => {
    const repo = new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });
    const { result } = montar(repo);
    await waitFor(() => expect(result.current.fase).toBe('listo'));
    await act(() => result.current.moverEstado('1', 'En curso'));
    expect(result.current.items.find((i) => i.id === '1')?.estado).toBe('En curso');
    expect((await repo.obtener('1')).estado).toBe('En curso');
  });

  it('deshace el cambio si Microsoft lo rechaza', async () => {
    const repo = new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });
    const { result } = montar(repo);
    await waitFor(() => expect(result.current.fase).toBe('listo'));
    const antes = result.current.items.find((i) => i.id === '1')?.estado;
    repo.actualizar = () => Promise.reject(new AppError('permiso'));
    await act(async () => {
      await result.current.moverEstado('1', 'Resuelto').catch(() => undefined);
    });
    expect(result.current.items.find((i) => i.id === '1')?.estado).toBe(antes);
  });

  it('muestra error si la carga inicial falla', async () => {
    const repo = new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });
    repo.abiertas = () => Promise.reject(new AppError('permiso'));
    const { result } = montar(repo);
    await waitFor(() => expect(result.current.fase).toBe('error'));
    expect(result.current.error).toBe('No tienes permiso para hacer esto. Avisa a IT.');
  });
});

describe('caché local', () => {
  it('una incidencia antigua consultada no altera los contadores', async () => {
    const repo = new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });
    const { result } = montar(repo);
    await waitFor(() => expect(result.current.fase).toBe('listo'));
    const antes = result.current.items.length;
    const antigua = await repo.obtener('139');
    act(() => result.current.guardarLocal(antigua));
    expect(result.current.items).toHaveLength(antes);
  });

  it('una incidencia creada aparece al momento', async () => {
    const repo = new DemoRepository({ ahora: () => ahora, latenciaMs: 0 });
    const { result } = montar(repo);
    await waitFor(() => expect(result.current.fase).toBe('listo'));
    await act(() =>
      result.current.crear({
        titulo: 'Nueva',
        area: 'General',
        tipo: 'Incidencia',
        prioridad: 'Baja',
        turno: 'Mañana',
        habitacion: '',
        descripcion: '',
        asignadoId: null,
      }),
    );
    expect(result.current.abiertas.some((i) => i.titulo === 'Nueva')).toBe(true);
  });
});
