import type { Incidencia } from './tipos';
import { ESTADO, PRIORIDAD } from './valores';
import { haceMasDeDias, haceMenosDe } from './tiempo';
import { esAbierta, ordenarPorPrioridad } from './filtros';
import { MS_DIA } from './valores';

export interface ResumenArea {
  area: string;
  abiertas: number;
  urgentes: number;
}

export function resumenPorArea(
  abiertas: readonly Incidencia[],
  areas: readonly string[],
): ResumenArea[] {
  return areas.map((area) => {
    const deArea = abiertas.filter((i) => i.area === area && esAbierta(i));
    return {
      area,
      abiertas: deArea.length,
      urgentes: deArea.filter((i) => i.prioridad === PRIORIDAD.urgente).length,
    };
  });
}

export interface Direccion {
  matriz: { area: string; porEstado: Record<string, number> }[];
  maximo: number;
  urgentesAbiertas: Incidencia[];
  antiguas: Incidencia[];
  resueltas7: number;
  resueltas30: number;
}

/**
 * @param abiertas incidencias no resueltas
 * @param resueltas resueltas en los últimos 30 días (con fecha de resolución)
 */
export function calcularDireccion(
  abiertas: readonly Incidencia[],
  resueltas: readonly Incidencia[],
  areas: readonly string[],
  estados: readonly string[],
  ahora: Date,
): Direccion {
  const todas = [...abiertas, ...resueltas];
  let maximo = 0;
  const matriz = areas.map((area) => {
    const porEstado: Record<string, number> = {};
    for (const e of estados) {
      const n = todas.filter((i) => i.area === area && i.estado === e).length;
      porEstado[e] = n;
      maximo = Math.max(maximo, n);
    }
    return { area, porEstado };
  });
  const resueltaEn = (dias: number) =>
    resueltas.filter(
      (i) =>
        i.estado === ESTADO.resuelto &&
        i.fechaResolucion !== null &&
        haceMenosDe(i.fechaResolucion, dias * MS_DIA, ahora),
    ).length;
  return {
    matriz,
    maximo,
    urgentesAbiertas: abiertas
      .filter((i) => esAbierta(i) && i.prioridad === PRIORIDAD.urgente)
      .sort(ordenarPorPrioridad),
    antiguas: abiertas
      .filter((i) => esAbierta(i) && haceMasDeDias(i.creado, 7, ahora))
      .sort((a, b) => a.creado.localeCompare(b.creado)),
    resueltas7: resueltaEn(7),
    resueltas30: resueltaEn(30),
  };
}
