export interface Persona {
  /** En producción, el id de usuario del sitio de SharePoint (LookupId). */
  id: string;
  nombre: string;
  email: string;
}

export interface NotaSeguimiento {
  fecha: string; // ISO 8601 UTC
  autor: string;
  texto: string;
}

export interface Incidencia {
  id: string;
  /** Versión del elemento en SharePoint, para detectar cambios simultáneos. */
  etag: string | null;
  titulo: string;
  area: string;
  tipo: string;
  prioridad: string;
  turno: string;
  habitacion: string;
  descripcion: string;
  estado: string;
  asignado: Persona | null;
  seguimiento: string;
  fechaResolucion: string | null;
  creado: string;
  modificado: string;
  autor: string;
  editor: string;
}

export interface NuevaIncidencia {
  titulo: string;
  area: string;
  tipo: string;
  prioridad: string;
  turno: string;
  habitacion: string;
  descripcion: string;
  asignadoId: string | null;
}

export interface CambioIncidencia {
  estado?: string;
  asignadoId?: string | null;
}

export interface OpcionesLista {
  area: readonly string[];
  tipo: readonly string[];
  prioridad: readonly string[];
  turno: readonly string[];
  estado: readonly string[];
}

export type Rol = 'manager' | 'equipo';

export interface Usuario {
  nombre: string;
  email: string;
  /** Id de la persona en la lista (para "Mis asignadas"); null si no se ha encontrado. */
  personaId: string | null;
  departamento: string | null;
  rol: Rol;
}

export interface Foto {
  nombre: string;
  ruta: string;
}

export interface Pagina<T> {
  elementos: T[];
  siguiente: string | null;
}
