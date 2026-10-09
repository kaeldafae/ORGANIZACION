import { AppError } from './errores';

export type ObtenerToken = (scopes: string[]) => Promise<string>;

export interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: BodyInit;
  headers?: Record<string, string>;
  scopes: string[];
  respuesta?: 'json' | 'blob' | 'nada';
  /** Para pruebas: sustituye la espera entre reintentos. */
  esperar?: (ms: number) => Promise<void>;
}

const MAX_REINTENTOS = 3;
const ESPERA_MAXIMA_MS = 30_000;

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Segundos de Retry-After (número o fecha HTTP); si no viene, espera exponencial. */
export function esperaReintento(cabecera: string | null, intento: number): number {
  if (cabecera) {
    const seg = Number(cabecera);
    if (Number.isFinite(seg) && seg >= 0) return Math.min(seg * 1000, ESPERA_MAXIMA_MS);
    const fecha = Date.parse(cabecera);
    if (Number.isFinite(fecha)) return Math.min(Math.max(fecha - Date.now(), 0), ESPERA_MAXIMA_MS);
  }
  return Math.min(1000 * 2 ** intento, ESPERA_MAXIMA_MS);
}

function errorPorEstado(estado: number): AppError {
  if (estado === 401 || estado === 403) return new AppError('permiso', undefined, estado);
  if (estado === 404) return new AppError('no-encontrado', undefined, estado);
  if (estado === 409 || estado === 412) return new AppError('conflicto', undefined, estado);
  if (estado === 429 || estado === 503) return new AppError('limite', undefined, estado);
  return new AppError('desconocido', undefined, estado);
}

/** Un 400 de SharePoint por filtrar sobre una columna sin índice es un fallo de configuración. */
async function errorPeticionInvalida(res: Response): Promise<AppError> {
  let cuerpo = '';
  try {
    cuerpo = await res.text();
  } catch {
    // sin cuerpo legible
  }
  if (/index/i.test(cuerpo)) {
    return new AppError(
      'configuracion',
      'Faltan índices en la lista de SharePoint (Área, Estado, Prioridad…). Avisa a IT.',
      400,
    );
  }
  return new AppError('desconocido', undefined, 400);
}

/**
 * Petición autenticada a Graph o SharePoint con reintentos ante 429/503
 * respetando Retry-After. Traduce los errores a AppError.
 */
export function crearCliente(obtenerToken: ObtenerToken) {
  async function peticion<T>(url: string, op: OpcionesPeticion): Promise<T> {
    const esperar = op.esperar ?? dormir;
    for (let intento = 0; ; intento++) {
      const token = await obtenerToken(op.scopes);
      let res: Response;
      try {
        res = await fetch(url, {
          method: op.method ?? 'GET',
          headers: { Authorization: `Bearer ${token}`, ...op.headers },
          body: op.body ?? null,
        });
      } catch {
        if (intento < MAX_REINTENTOS && (op.method ?? 'GET') === 'GET') {
          await esperar(esperaReintento(null, intento));
          continue;
        }
        throw new AppError('red');
      }
      if ((res.status === 429 || res.status === 503) && intento < MAX_REINTENTOS) {
        await esperar(esperaReintento(res.headers.get('Retry-After'), intento));
        continue;
      }
      if (res.status === 400) throw await errorPeticionInvalida(res);
      if (!res.ok) throw errorPorEstado(res.status);
      if (op.respuesta === 'nada' || res.status === 204) return undefined as T;
      if (op.respuesta === 'blob') return (await res.blob()) as T;
      return (await res.json()) as T;
    }
  }
  return { peticion };
}

export type Cliente = ReturnType<typeof crearCliente>;
