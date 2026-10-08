import type { OpcionesLista } from '../domain/tipos';
import { ESTADO, PRIORIDAD } from '../domain/valores';
import { normalizar } from '../domain/texto';

/** Columna tal y como la devuelve GET /sites/{id}/lists/{id}/columns. */
export interface ColumnaGraph {
  name: string;
  displayName: string;
  hidden?: boolean;
  readOnly?: boolean;
  choice?: { choices?: string[] };
  personOrGroup?: object;
  dateTime?: object;
  text?: { allowMultipleLines?: boolean };
}

export type CampoLogico =
  | 'titulo'
  | 'area'
  | 'tipo'
  | 'prioridad'
  | 'turno'
  | 'habitacion'
  | 'descripcion'
  | 'estado'
  | 'asignado'
  | 'seguimiento'
  | 'fechaResolucion';

type TipoColumna = 'texto' | 'eleccion' | 'persona' | 'fecha';

const DEFINICION: Record<CampoLogico, { nombres: string[]; tipo: TipoColumna }> = {
  titulo: { nombres: ['Título', 'Title'], tipo: 'texto' },
  area: { nombres: ['Área', 'Area'], tipo: 'eleccion' },
  tipo: { nombres: ['Tipo'], tipo: 'eleccion' },
  prioridad: { nombres: ['Prioridad'], tipo: 'eleccion' },
  turno: { nombres: ['Turno'], tipo: 'eleccion' },
  habitacion: { nombres: ['Habitación'], tipo: 'texto' },
  descripcion: { nombres: ['Descripción'], tipo: 'texto' },
  estado: { nombres: ['Estado'], tipo: 'eleccion' },
  asignado: { nombres: ['Asignado a'], tipo: 'persona' },
  seguimiento: { nombres: ['Seguimiento'], tipo: 'texto' },
  fechaResolucion: { nombres: ['Fecha de resolución'], tipo: 'fecha' },
};

export const NOMBRE_VISIBLE: Record<CampoLogico, string> = Object.fromEntries(
  Object.entries(DEFINICION).map(([k, v]) => [k, v.nombres[0] ?? k]),
) as Record<CampoLogico, string>;

export interface MapaColumnas {
  /** Nombre interno de SharePoint para cada campo lógico. */
  interno: Record<CampoLogico, string>;
  opciones: OpcionesLista;
}

export class ErrorColumnas extends Error {
  readonly problemas: string[];
  constructor(problemas: string[]) {
    super(`La lista no tiene la estructura esperada: ${problemas.join(' ')}`);
    this.name = 'ErrorColumnas';
    this.problemas = problemas;
  }
}

function coincideTipo(c: ColumnaGraph, tipo: TipoColumna): boolean {
  switch (tipo) {
    case 'eleccion':
      return c.choice !== undefined;
    case 'persona':
      return c.personOrGroup !== undefined;
    case 'fecha':
      return c.dateTime !== undefined;
    case 'texto':
      return c.text !== undefined;
  }
}

/**
 * Construye el mapa nombre visible → nombre interno a partir de las columnas
 * reales de la lista. No se adivinan nombres internos (las tildes se codifican,
 * p. ej. "Área" → "_x00c1_rea").
 */
export function construirMapa(columnas: readonly ColumnaGraph[]): MapaColumnas {
  const problemas: string[] = [];
  const editables = columnas.filter((c) => !c.readOnly);
  const interno: Partial<Record<CampoLogico, string>> = {};
  const choices: Partial<Record<CampoLogico, string[]>> = {};

  for (const [campo, def] of Object.entries(DEFINICION) as [
    CampoLogico,
    (typeof DEFINICION)[CampoLogico],
  ][]) {
    const buscados = new Set(def.nombres.map(normalizar));
    const candidata =
      (campo === 'titulo' ? editables.find((c) => c.name === 'Title') : undefined) ??
      editables.find((c) => !c.hidden && buscados.has(normalizar(c.displayName))) ??
      editables.find((c) => buscados.has(normalizar(c.displayName)));

    if (!candidata) {
      problemas.push(`Falta la columna "${NOMBRE_VISIBLE[campo]}".`);
      continue;
    }
    if (!coincideTipo(candidata, def.tipo)) {
      problemas.push(`La columna "${NOMBRE_VISIBLE[campo]}" no es del tipo esperado.`);
      continue;
    }
    interno[campo] = candidata.name;
    choices[campo] = candidata.choice?.choices ?? [];
  }

  const exigir = (campo: CampoLogico, valores: string[]) => {
    const disponibles = choices[campo];
    if (!disponibles) return;
    const faltan = valores.filter((v) => !disponibles.includes(v));
    if (faltan.length > 0)
      problemas.push(`La columna "${NOMBRE_VISIBLE[campo]}" debe incluir: ${faltan.join(', ')}.`);
  };
  exigir('estado', Object.values(ESTADO));
  exigir('prioridad', Object.values(PRIORIDAD));
  for (const campo of ['area', 'tipo', 'turno'] as const) {
    if (choices[campo]?.length === 0)
      problemas.push(`La columna "${NOMBRE_VISIBLE[campo]}" no tiene opciones.`);
  }

  if (problemas.length > 0) throw new ErrorColumnas(problemas);

  return {
    interno: interno as Record<CampoLogico, string>,
    opciones: {
      area: choices.area ?? [],
      tipo: choices.tipo ?? [],
      prioridad: choices.prioridad ?? [],
      turno: choices.turno ?? [],
      estado: choices.estado ?? [],
    },
  };
}
