import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Incidencia } from '../domain/tipos';
import { LIMITES } from '../domain/valores';
import { aplicarFiltros } from '../domain/filtros';
import { fechaHora } from '../domain/tiempo';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { mensajeDe } from '../data/errores';
import { Enlace } from '../router/router';
import { BloqueError, Cargando, Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

/** Resueltas, de la más reciente a la más antigua. Carga por páginas (no todo de golpe). */
export function Historial() {
  const { repo, ahora } = useIncidencias();
  const { config, usuario } = useSesion();
  const [items, setItems] = useState<Incidencia[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const iniciado = useRef(false);

  const cargar = useCallback(
    async (cursor: string | null) => {
      setCargando(true);
      setError(null);
      try {
        const p = await repo.historial(cursor);
        setItems((prev) => (cursor === null ? p.elementos : [...prev, ...p.elementos]));
        setSiguiente(p.siguiente);
      } catch (e) {
        setError(mensajeDe(e));
      } finally {
        setCargando(false);
      }
    },
    [repo],
  );

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    void cargar(null);
  }, [cargar]);

  const visibles = useMemo(
    () =>
      aplicarFiltros(items, new Set(), busqueda, {
        personaId: usuario.personaId,
        ahora,
        zona: config.zona,
      }),
    [items, busqueda, usuario.personaId, ahora, config.zona],
  );

  return (
    <div className="pagina">
      <h1 className="pagina__titulo">Historial</h1>
      <p className="pagina__ayuda">Incidencias resueltas, de la más reciente a la más antigua.</p>
      <label className="buscador">
        <span className="sr-only">Buscar en el historial</span>
        <Icono nombre="buscar" tamano={18} />
        <input
          type="search"
          placeholder="Buscar en lo cargado…"
          value={busqueda}
          maxLength={LIMITES.busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>
      {busqueda && siguiente && (
        <p className="ayuda">
          La búsqueda mira solo lo cargado. Pulsa «Cargar más» para buscar más atrás.
        </p>
      )}

      {visibles.length === 0 && !cargando && !error && (
        <Vacio>
          {busqueda ? 'Nada coincide con la búsqueda.' : 'Todavía no hay nada resuelto.'}
        </Vacio>
      )}
      {visibles.length > 0 && (
        <ul className="lista">
          {visibles.map((i) => (
            <li key={i.id} className="fila">
              <Enlace a={`/incidencia/${i.id}`} className="fila__enlace">
                <span className="fila__titulo">
                  {i.titulo}
                  {i.habitacion && <span className="fila__hab"> · {i.habitacion}</span>}
                </span>
                <span className="fila__meta">
                  <span>{i.area}</span>
                  <span>{i.asignado?.nombre ?? 'Sin asignar'}</span>
                  <time dateTime={i.modificado}>{fechaHora(i.modificado, config.zona)}</time>
                </span>
              </Enlace>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <BloqueError
          mensaje={error}
          reintentar={() => void cargar(items.length ? siguiente : null)}
        />
      )}
      {cargando && <Cargando />}
      {!cargando && siguiente && (
        <button
          type="button"
          className="boton boton--secundario"
          onClick={() => void cargar(siguiente)}
        >
          Cargar más
        </button>
      )}
    </div>
  );
}
