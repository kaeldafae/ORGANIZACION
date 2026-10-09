import type { CambioIncidencia, Incidencia, NuevaIncidencia, Persona } from '../domain/tipos';
import { ESTADO } from '../domain/valores';
import type { MapaColumnas } from './columnas';

/** Elemento de lista tal y como lo devuelve Graph con expand=fields. */
export interface ItemGraph {
  id: string;
  eTag?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: { user?: { displayName?: string } };
  lastModifiedBy?: { user?: { displayName?: string } };
  fields?: Record<string, unknown>;
}

const texto = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

/** Los campos de persona se leen y escriben como "<nombre interno>LookupId". */
export const campoLookup = (interno: string): string => `${interno}LookupId`;

export function itemAIncidencia(
  item: ItemGraph,
  mapa: MapaColumnas,
  personas: ReadonlyMap<string, Persona>,
): Incidencia {
  const f = item.fields ?? {};
  const c = mapa.interno;
  const lookup = texto(f[campoLookup(c.asignado)]);
  const fechaRes = texto(f[c.fechaResolucion]);
  return {
    id: item.id,
    etag: item.eTag ?? null,
    titulo: texto(f[c.titulo]),
    area: texto(f[c.area]),
    tipo: texto(f[c.tipo]),
    prioridad: texto(f[c.prioridad]),
    turno: texto(f[c.turno]),
    habitacion: texto(f[c.habitacion]),
    descripcion: texto(f[c.descripcion]),
    estado: texto(f[c.estado]) || ESTADO.pendiente,
    asignado: lookup
      ? (personas.get(lookup) ?? { id: lookup, nombre: 'Persona no encontrada', email: '' })
      : null,
    seguimiento: texto(f[c.seguimiento]),
    fechaResolucion: fechaRes || null,
    creado: item.createdDateTime ?? texto(f.Created),
    modificado: item.lastModifiedDateTime ?? texto(f.Modified),
    autor: item.createdBy?.user?.displayName ?? '',
    editor: item.lastModifiedBy?.user?.displayName ?? '',
  };
}

/** Lista de campos para $expand=fields($select=...). */
export function camposSelect(mapa: MapaColumnas): string {
  const c = mapa.interno;
  return [
    c.titulo,
    c.area,
    c.tipo,
    c.prioridad,
    c.turno,
    c.habitacion,
    c.descripcion,
    c.estado,
    campoLookup(c.asignado),
    c.seguimiento,
    c.fechaResolucion,
    'Created',
    'Modified',
  ].join(',');
}

export function nuevaACampos(datos: NuevaIncidencia, mapa: MapaColumnas): Record<string, unknown> {
  const c = mapa.interno;
  const campos: Record<string, unknown> = {
    [c.titulo]: datos.titulo,
    [c.area]: datos.area,
    [c.tipo]: datos.tipo,
    [c.prioridad]: datos.prioridad,
    [c.turno]: datos.turno,
    [c.estado]: ESTADO.pendiente,
  };
  if (datos.habitacion) campos[c.habitacion] = datos.habitacion;
  if (datos.descripcion) campos[c.descripcion] = datos.descripcion;
  if (datos.asignadoId) campos[campoLookup(c.asignado)] = datos.asignadoId;
  return campos;
}

export function cambioACampos(
  cambio: CambioIncidencia,
  mapa: MapaColumnas,
  ahora: Date,
): Record<string, unknown> {
  const c = mapa.interno;
  const campos: Record<string, unknown> = {};
  if (cambio.estado !== undefined) {
    campos[c.estado] = cambio.estado;
    // La fecha de resolución se fija al resolver y se borra si se reabre.
    campos[c.fechaResolucion] = cambio.estado === ESTADO.resuelto ? ahora.toISOString() : null;
  }
  if (cambio.asignadoId !== undefined) {
    campos[campoLookup(c.asignado)] = cambio.asignadoId;
  }
  return campos;
}

/** Escapa una cadena para un literal OData ('O''Brien'). */
export const odata = (v: string): string => `'${v.replace(/'/g, "''")}'`;
