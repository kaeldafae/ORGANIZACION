/**
 * Valores con significado para la lógica de la app (qué es "resuelto", qué es
 * "urgente"...). Las opciones que se muestran en los desplegables se leen de la
 * lista de SharePoint; estas constantes solo se usan para decidir comportamiento
 * y, al arrancar, se comprueba que existen en la lista.
 */
export const ESTADO = {
  pendiente: 'Pendiente',
  enCurso: 'En curso',
  resuelto: 'Resuelto',
} as const;

export const PRIORIDAD = {
  urgente: 'Urgente',
  normal: 'Normal',
  baja: 'Baja',
} as const;

export const TIPO_REUNION = 'Nota para reunión';

/** Orden del flujo de trabajo en el tablero. */
export const FLUJO_ESTADOS: readonly string[] = [ESTADO.pendiente, ESTADO.enCurso, ESTADO.resuelto];

/** Peso para ordenar: urgentes primero. Valores desconocidos van al final. */
export function pesoPrioridad(prioridad: string): number {
  switch (prioridad) {
    case PRIORIDAD.urgente:
      return 0;
    case PRIORIDAD.normal:
      return 1;
    case PRIORIDAD.baja:
      return 2;
    default:
      return 3;
  }
}

/** Opciones que usa el modo demo (en producción se leen de la lista). */
export const OPCIONES_DEMO = {
  area: ['Mayordomía', 'Recepción', 'Botones', 'General'],
  tipo: ['Incidencia', 'Petición de huésped', 'Error interno', TIPO_REUNION, 'Traspaso de turno'],
  prioridad: [PRIORIDAD.urgente, PRIORIDAD.normal, PRIORIDAD.baja],
  turno: ['Mañana', 'Tarde', 'Noche'],
  estado: [...FLUJO_ESTADOS],
} as const;

export const LIMITES = {
  titulo: 120,
  habitacion: 30,
  descripcion: 2000,
  nota: 1000,
  /** Margen bajo el máximo de 63.999 caracteres de una columna de texto multilínea. */
  seguimientoTotal: 60000,
  busqueda: 100,
} as const;

export const MS_HORA = 3_600_000;
export const MS_DIA = 24 * MS_HORA;
