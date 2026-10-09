import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { normalizar } from '../domain/texto';
import { almacen } from '../ui/almacen';

const CLAVE = 'incidencias.area';

/** Área del usuario: la elegida en este navegador o, si no, su departamento en Entra ID. */
export function resolverArea(
  areas: readonly string[],
  departamento: string | null,
  guardada: string | null,
): string | null {
  if (guardada && areas.includes(guardada)) return guardada;
  if (departamento) {
    const d = normalizar(departamento);
    const area =
      areas.find((a) => normalizar(a) === d) ?? areas.find((a) => d.includes(normalizar(a)));
    if (area) return area;
  }
  return null;
}

interface ContextoArea {
  area: string | null;
  elegir: (area: string) => void;
}

const Ctx = createContext<ContextoArea | null>(null);

export function AreaProvider({
  areas,
  departamento,
  children,
}: {
  areas: readonly string[];
  departamento: string | null;
  children: ReactNode;
}) {
  const [guardada, setGuardada] = useState(() => almacen.leer(CLAVE));
  const elegir = useCallback((a: string) => {
    almacen.guardar(CLAVE, a);
    setGuardada(a);
  }, []);
  const valor = useMemo(
    () => ({ area: resolverArea(areas, departamento, guardada), elegir }),
    [areas, departamento, guardada, elegir],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useArea(): ContextoArea {
  const c = useContext(Ctx);
  if (!c) throw new Error('useArea fuera de <AreaProvider>');
  return c;
}
