import { createContext, useContext, type ReactNode } from 'react';
import type { ConfigComun } from '../config';
import type { Rol, Usuario } from '../domain/tipos';

export interface Sesion {
  usuario: Usuario;
  demo: boolean;
  config: ConfigComun;
  /** Solo en modo demo: simular manager o equipo. */
  cambiarRol?: (rol: Rol) => void;
  cerrarSesion?: () => void;
}

const Ctx = createContext<Sesion | null>(null);

export function SesionProvider({ valor, children }: { valor: Sesion; children: ReactNode }) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSesion fuera de <SesionProvider>');
  return c;
}
