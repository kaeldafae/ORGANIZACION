import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Incidencia, NuevaIncidencia, OpcionesLista, Persona } from '../domain/tipos';
import { MS_DIA } from '../domain/valores';
import { esAbierta } from '../domain/filtros';
import type { IncidenciasRepository } from '../data/repositorio';
import { mensajeDe } from '../data/errores';
import { useAvisos } from './avisos';

export const INTERVALO_REFRESCO_MS = 60_000;
const DIAS_RESUELTAS = 30;

interface Datos {
  opciones: OpcionesLista;
  personas: Persona[];
  items: Incidencia[];
}

interface ContextoIncidencias {
  repo: IncidenciasRepository;
  fase: 'cargando' | 'listo' | 'error';
  error: string | null;
  opciones: OpcionesLista | null;
  personas: Persona[];
  /** Abiertas + resueltas de los últimos 30 días. */
  items: Incidencia[];
  abiertas: Incidencia[];
  refrescando: boolean;
  actualizado: Date | null;
  ahora: Date;
  refrescar: () => Promise<void>;
  crear: (datos: NuevaIncidencia) => Promise<Incidencia>;
  moverEstado: (id: string, estado: string) => Promise<void>;
  reasignar: (id: string, personaId: string | null) => Promise<void>;
  anadirNota: (id: string, texto: string, autor: string) => Promise<Incidencia>;
  guardarLocal: (inc: Incidencia) => void;
}

const Ctx = createContext<ContextoIncidencias | null>(null);

/**
 * Sustituye la versión de una incidencia ya cargada. Solo añade si se pide: una
 * incidencia antigua abierta desde el historial no debe colarse en los contadores.
 */
function fusionar(items: Incidencia[], inc: Incidencia, anadir = false): Incidencia[] {
  const i = items.findIndex((x) => x.id === inc.id);
  if (i < 0) return anadir ? [...items, inc] : items;
  const copia = items.slice();
  copia[i] = inc;
  return copia;
}

export function IncidenciasProvider({
  repo,
  children,
  ahora: reloj = () => new Date(),
}: {
  repo: IncidenciasRepository;
  children: ReactNode;
  ahora?: () => Date;
}) {
  const { avisar } = useAvisos();
  const [fase, setFase] = useState<ContextoIncidencias['fase']>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [ahora, setAhora] = useState(reloj);
  /** Ids con un cambio en curso: un refresco no debe pisar su versión optimista. */
  const pendientes = useRef(new Set<string>());
  const relojRef = useRef(reloj);
  const enCurso = useRef<Promise<void> | null>(null);
  const datosRef = useRef<Datos | null>(null);
  useEffect(() => {
    datosRef.current = datos;
  }, [datos]);

  const cargar = useCallback(
    async (completo: boolean) => {
      const t = relojRef.current();
      const desde = new Date(t.getTime() - DIAS_RESUELTAS * MS_DIA).toISOString();
      const [opciones, personas, abiertas, resueltas] = await Promise.all([
        completo ? repo.opciones() : Promise.resolve(null),
        completo ? repo.personas() : Promise.resolve(null),
        repo.abiertas(),
        repo.resueltasDesde(desde),
      ]);
      setDatos((prev) => {
        const nuevos = [...abiertas, ...resueltas];
        const items = prev
          ? nuevos.map((n) =>
              pendientes.current.has(n.id) ? (prev.items.find((p) => p.id === n.id) ?? n) : n,
            )
          : nuevos;
        return {
          opciones: opciones ??
            prev?.opciones ?? { area: [], tipo: [], prioridad: [], turno: [], estado: [] },
          personas: personas ?? prev?.personas ?? [],
          items,
        };
      });
      setActualizado(t);
      setAhora(t);
    },
    [repo],
  );

  // Carga inicial
  useEffect(() => {
    let vivo = true;
    cargar(true)
      .then(() => {
        if (vivo) setFase('listo');
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setError(mensajeDe(e));
        setFase('error');
      });
    return () => {
      vivo = false;
    };
  }, [cargar]);

  const refrescar = useCallback(async () => {
    if (enCurso.current) return enCurso.current;
    setRefrescando(true);
    const p = cargar(true)
      .then(() => {
        setError(null);
        setFase('listo');
      })
      .catch((e: unknown) => {
        avisar(mensajeDe(e), 'error');
      })
      .finally(() => {
        setRefrescando(false);
        enCurso.current = null;
      });
    enCurso.current = p;
    return p;
  }, [cargar, avisar]);

  // Refresco automático cada 60 s mientras la pestaña está visible.
  useEffect(() => {
    if (fase !== 'listo') return;
    const silencioso = () => {
      if (document.visibilityState !== 'visible' || enCurso.current) return;
      const p = cargar(false)
        .catch(() => {
          // Un fallo puntual en segundo plano no interrumpe; el botón de refrescar lo mostrará.
        })
        .finally(() => {
          enCurso.current = null;
        });
      enCurso.current = p;
    };
    const id = window.setInterval(silencioso, INTERVALO_REFRESCO_MS);
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      setAhora(relojRef.current());
      silencioso();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [fase, cargar]);

  const guardarLocal = useCallback((inc: Incidencia) => {
    setDatos((d) => (d ? { ...d, items: fusionar(d.items, inc) } : d));
  }, []);

  /** Aplica un cambio en pantalla al instante; si Microsoft lo rechaza, lo deshace. */
  const optimista = useCallback(
    async (
      id: string,
      local: (i: Incidencia) => Incidencia,
      remoto: () => Promise<Incidencia>,
      exito: string,
    ) => {
      // Se lee la versión actual desde la ref: el actualizador de setState puede ejecutarse
      // más tarde y no serviría para guardar la copia con la que deshacer.
      const anterior = datosRef.current?.items.find((x) => x.id === id);
      if (anterior) guardarLocal(local(anterior));
      pendientes.current.add(id);
      try {
        const actualizada = await remoto();
        pendientes.current.delete(id);
        guardarLocal(actualizada);
        avisar(exito, 'exito');
      } catch (e) {
        pendientes.current.delete(id);
        if (anterior) guardarLocal(anterior);
        avisar(`${mensajeDe(e)} No se ha guardado el cambio.`, 'error');
        throw e;
      }
    },
    [avisar, guardarLocal],
  );

  const moverEstado = useCallback(
    (id: string, estado: string) =>
      optimista(
        id,
        (i) => ({ ...i, estado }),
        () => repo.actualizar(id, { estado }),
        `Movida a "${estado}".`,
      ),
    [optimista, repo],
  );

  const reasignar = useCallback(
    (id: string, personaId: string | null) =>
      optimista(
        id,
        (i) => ({
          ...i,
          asignado: personaId ? (datos?.personas.find((p) => p.id === personaId) ?? null) : null,
        }),
        () => repo.actualizar(id, { asignadoId: personaId }),
        personaId ? 'Asignación actualizada.' : 'Incidencia sin asignar.',
      ),
    [optimista, repo, datos?.personas],
  );

  const crear = useCallback(
    async (nueva: NuevaIncidencia) => {
      const creada = await repo.crear(nueva);
      setDatos((d) => (d ? { ...d, items: fusionar(d.items, creada, true) } : d));
      return creada;
    },
    [repo],
  );

  const anadirNota = useCallback(
    async (id: string, texto: string, autor: string) => {
      const inc = await repo.anadirNota(id, texto, autor);
      guardarLocal(inc);
      return inc;
    },
    [repo, guardarLocal],
  );

  const valor = useMemo<ContextoIncidencias>(() => {
    const items = datos?.items ?? [];
    return {
      repo,
      fase,
      error,
      opciones: datos?.opciones ?? null,
      personas: datos?.personas ?? [],
      items,
      abiertas: items.filter(esAbierta),
      refrescando,
      actualizado,
      ahora,
      refrescar,
      crear,
      moverEstado,
      reasignar,
      anadirNota,
      guardarLocal,
    };
  }, [
    repo,
    fase,
    error,
    datos,
    refrescando,
    actualizado,
    ahora,
    refrescar,
    crear,
    moverEstado,
    reasignar,
    anadirNota,
    guardarLocal,
  ]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useIncidencias(): ContextoIncidencias {
  const c = useContext(Ctx);
  if (!c) throw new Error('useIncidencias fuera de <IncidenciasProvider>');
  return c;
}
