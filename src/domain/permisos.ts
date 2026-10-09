import type { Rol } from './tipos';

/**
 * Permisos de INTERFAZ. Sirven para no mostrar opciones que no tocan; la
 * seguridad real la imponen los permisos de SharePoint sobre la lista.
 */
export type Accion =
  'verDireccion' | 'reasignar' | 'asignarAlCrear' | 'crear' | 'comentar' | 'moverEstado';

const PERMISOS: Record<Rol, ReadonlySet<Accion>> = {
  manager: new Set<Accion>([
    'verDireccion',
    'reasignar',
    'asignarAlCrear',
    'crear',
    'comentar',
    'moverEstado',
  ]),
  equipo: new Set<Accion>(['asignarAlCrear', 'crear', 'comentar', 'moverEstado']),
};

export function puede(rol: Rol, accion: Accion): boolean {
  return PERMISOS[rol].has(accion);
}
