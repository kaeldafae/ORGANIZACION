import { ESTADO, PRIORIDAD } from '../domain/valores';

function clasePrioridad(p: string): string {
  if (p === PRIORIDAD.urgente) return 'etiqueta--rojo';
  if (p === PRIORIDAD.normal) return 'etiqueta--ambar';
  return 'etiqueta--gris';
}

function claseEstado(e: string): string {
  if (e === ESTADO.pendiente) return 'etiqueta--rojo';
  if (e === ESTADO.enCurso) return 'etiqueta--ambar';
  if (e === ESTADO.resuelto) return 'etiqueta--verde';
  return 'etiqueta--gris';
}

/** El color nunca va solo: la etiqueta siempre lleva el texto. */
export function EtiquetaPrioridad({ prioridad }: { prioridad: string }) {
  return (
    <span className={`etiqueta ${clasePrioridad(prioridad)}`}>
      <span className="sr-only">Prioridad: </span>
      {prioridad}
    </span>
  );
}

export function EtiquetaEstado({ estado }: { estado: string }) {
  return (
    <span className={`etiqueta etiqueta--contorno ${claseEstado(estado)}`}>
      <span className="sr-only">Estado: </span>
      {estado}
    </span>
  );
}
