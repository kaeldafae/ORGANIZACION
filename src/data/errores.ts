export type TipoError =
  | 'permiso'
  | 'no-encontrado'
  | 'conflicto'
  | 'limite'
  | 'red'
  | 'configuracion'
  | 'validacion'
  | 'desconocido';

/** Error con un mensaje apto para mostrar al usuario. Nunca lleva trazas técnicas. */
export class AppError extends Error {
  readonly tipo: TipoError;
  readonly estado: number | null;

  constructor(tipo: TipoError, mensaje?: string, estado: number | null = null) {
    super(mensaje ?? MENSAJES[tipo]);
    this.name = 'AppError';
    this.tipo = tipo;
    this.estado = estado;
  }
}

export const MENSAJES: Record<TipoError, string> = {
  permiso: 'No tienes permiso para hacer esto. Avisa a IT.',
  'no-encontrado': 'No se ha encontrado. Puede que alguien lo haya borrado.',
  conflicto: 'Otra persona ha cambiado esto a la vez. Vuelve a intentarlo.',
  limite:
    'Microsoft está recibiendo demasiadas peticiones. Espera un momento y vuelve a intentarlo.',
  red: 'No hay conexión. Comprueba la red y vuelve a intentarlo.',
  configuracion: 'La app no está bien configurada. Avisa a IT.',
  validacion: 'Revisa los datos del formulario.',
  desconocido: 'Algo ha fallado. Vuelve a intentarlo y, si se repite, avisa a IT.',
};

export function mensajeDe(error: unknown): string {
  return error instanceof AppError ? error.message : MENSAJES.desconocido;
}
