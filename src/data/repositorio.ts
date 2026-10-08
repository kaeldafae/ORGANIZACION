import type {
  CambioIncidencia,
  Foto,
  Incidencia,
  NuevaIncidencia,
  OpcionesLista,
  Pagina,
  Persona,
} from '../domain/tipos';

/**
 * Acceso a los datos de incidencias. Hay dos implementaciones:
 * GraphRepository (Microsoft 365) y DemoRepository (en memoria).
 */
export interface IncidenciasRepository {
  opciones(): Promise<OpcionesLista>;
  personas(): Promise<Persona[]>;
  /** Todas las no resueltas. */
  abiertas(): Promise<Incidencia[]>;
  /** Resueltas con fecha de resolución posterior a `desde` (ISO). */
  resueltasDesde(desde: string): Promise<Incidencia[]>;
  /** Historial de resueltas, de la más reciente a la más antigua, por páginas. */
  historial(cursor: string | null): Promise<Pagina<Incidencia>>;
  obtener(id: string): Promise<Incidencia>;
  crear(datos: NuevaIncidencia): Promise<Incidencia>;
  actualizar(id: string, cambio: CambioIncidencia): Promise<Incidencia>;
  anadirNota(id: string, texto: string, autor: string): Promise<Incidencia>;
  fotos(id: string): Promise<Foto[]>;
  subirFoto(id: string, archivo: Blob, nombre: string): Promise<void>;
  descargarFoto(foto: Foto): Promise<Blob>;
}
