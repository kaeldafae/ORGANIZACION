import type { Incidencia } from './tipos';
import { ESTADO, PRIORIDAD, TIPO_REUNION, pesoPrioridad } from './valores';
import { normalizar } from './texto';
import { esHoy } from './tiempo';

export type FiltroRapido = 'mias' | 'urgentes' | 'hoy' | 'reunion';

export const FILTROS_RAPIDOS: readonly { id: FiltroRapido; etiqueta: string }[] = [
  { id: 'mias', etiqueta: 'Mis asignadas' },
  { id: 'urgentes', etiqueta: 'Urgentes' },
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'reunion', etiqueta: 'Para reunión' },
];

export interface ContextoFiltro {
  personaId: string | null;
  ahora: Date;
  zona: string;
}

export const esAbierta = (i: Incidencia): boolean => i.estado !== ESTADO.resuelto;

function cumple(i: Incidencia, f: FiltroRapido, ctx: ContextoFiltro): boolean {
  switch (f) {
    case 'mias':
      return ctx.personaId !== null && i.asignado?.id === ctx.personaId;
    case 'urgentes':
      return i.prioridad === PRIORIDAD.urgente;
    case 'hoy':
      return esHoy(i.creado, ctx.ahora, ctx.zona);
    case 'reunion':
      return i.tipo === TIPO_REUNION;
  }
}

/** Todos los filtros activos deben cumplirse a la vez. */
export function aplicarFiltros(
  lista: readonly Incidencia[],
  activos: ReadonlySet<FiltroRapido>,
  busqueda: string,
  ctx: ContextoFiltro,
): Incidencia[] {
  const q = normalizar(busqueda);
  return lista.filter((i) => {
    for (const f of activos) if (!cumple(i, f, ctx)) return false;
    if (!q) return true;
    return normalizar(`${i.titulo} ${i.habitacion} ${i.descripcion}`).includes(q);
  });
}

/** Urgentes primero; dentro de la misma prioridad, lo más reciente arriba. */
export function ordenarPorPrioridad(a: Incidencia, b: Incidencia): number {
  return (
    pesoPrioridad(a.prioridad) - pesoPrioridad(b.prioridad) || b.creado.localeCompare(a.creado)
  );
}

export function agruparPorArea(
  lista: readonly Incidencia[],
  areas: readonly string[],
): Map<string, Incidencia[]> {
  const grupos = new Map<string, Incidencia[]>(areas.map((a) => [a, []]));
  for (const i of lista) {
    const g = grupos.get(i.area);
    if (g) g.push(i);
    else grupos.set(i.area, [i]);
  }
  for (const g of grupos.values()) g.sort(ordenarPorPrioridad);
  return grupos;
}

export function siguienteEstado(estado: string, flujo: readonly string[]): string | null {
  const i = flujo.indexOf(estado);
  if (i < 0) return flujo[0] ?? null;
  return flujo[i + 1] ?? null;
}
