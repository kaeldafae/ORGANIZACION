import { useMemo, useState } from 'react';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { useArea } from '../state/area';
import {
  FILTROS_RAPIDOS,
  agruparPorArea,
  aplicarFiltros,
  type FiltroRapido,
} from '../domain/filtros';
import { resumenPorArea } from '../domain/estadisticas';
import { ESTADO, LIMITES } from '../domain/valores';
import { slug } from '../domain/texto';
import { Enlace } from '../router/router';
import { Plegable } from '../ui/Plegable';
import { ListaIncidencias } from '../ui/FilaIncidencia';
import { Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

export function Inicio() {
  const { abiertas, items, opciones, ahora } = useIncidencias();
  const { usuario, config } = useSesion();
  const { area: miArea, elegir } = useArea();
  const [activos, setActivos] = useState<ReadonlySet<FiltroRapido>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const areas = useMemo(() => opciones?.area ?? [], [opciones]);

  const filtradas = useMemo(
    () =>
      aplicarFiltros(abiertas, activos, busqueda, {
        personaId: usuario.personaId,
        ahora,
        zona: config.zona,
      }),
    [abiertas, activos, busqueda, usuario.personaId, ahora, config.zona],
  );
  const grupos = useMemo(() => agruparPorArea(filtradas, areas), [filtradas, areas]);
  const resumen = useMemo(() => resumenPorArea(abiertas, areas), [abiertas, areas]);
  const resueltas = items.filter((i) => i.estado === ESTADO.resuelto).length;
  const filtrando = activos.size > 0 || busqueda.trim() !== '';

  const alternar = (f: FiltroRapido) => {
    setActivos((prev) => {
      const s = new Set(prev);
      if (s.has(f)) s.delete(f);
      else s.add(f);
      return s;
    });
  };

  return (
    <div className="pagina">
      <h1 className="pagina__titulo">Inicio</h1>

      {!miArea && areas.length > 0 && (
        <div className="tarjeta aviso-area">
          <p id="pregunta-area">¿En qué área trabajas? Así abrimos primero lo tuyo.</p>
          <div className="chips" role="group" aria-labelledby="pregunta-area">
            {areas.map((a) => (
              <button key={a} type="button" className="chip" onClick={() => elegir(a)}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="barra-filtros">
        <div className="chips" role="group" aria-label="Filtros rápidos">
          {FILTROS_RAPIDOS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              aria-pressed={activos.has(f.id)}
              onClick={() => alternar(f.id)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <label className="buscador">
          <span className="sr-only">Buscar por título, habitación o descripción</span>
          <Icono nombre="buscar" tamano={18} />
          <input
            type="search"
            placeholder="Buscar: título, habitación…"
            value={busqueda}
            maxLength={LIMITES.busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
      </div>

      <ul className="contadores" aria-label="Abiertas por área">
        {resumen.map((r) => (
          <li key={r.area}>
            <Enlace
              a={`/area/${slug(r.area)}`}
              className={`contador${r.urgentes > 0 ? ' contador--alerta' : ''}`}
            >
              <span className="contador__area">{r.area}</span>
              <span className="contador__total">{r.abiertas}</span>
              <span className="contador__detalle">
                {r.abiertas === 1 ? 'abierta' : 'abiertas'}
                {' · '}
                {r.urgentes} {r.urgentes === 1 ? 'urgente' : 'urgentes'}
              </span>
            </Enlace>
          </li>
        ))}
      </ul>

      {filtrando && (
        <p className="resultado-filtro" role="status">
          {filtradas.length === 0
            ? 'Nada coincide con los filtros.'
            : `${String(filtradas.length)} ${filtradas.length === 1 ? 'resultado' : 'resultados'}`}
        </p>
      )}

      {[...grupos.entries()].map(([area, lista]) => {
        if (filtrando && lista.length === 0) return null;
        return (
          <Plegable
            key={`${area}-${miArea ?? ''}-${filtrando ? 'f' : ''}`}
            titulo={area}
            resumen={`${String(lista.length)} ${lista.length === 1 ? 'abierta' : 'abiertas'}`}
            abiertoInicial={filtrando || area === miArea}
          >
            {lista.length === 0 ? (
              <Vacio>No hay nada pendiente en {area}.</Vacio>
            ) : (
              <ListaIncidencias items={lista} ahora={ahora} />
            )}
          </Plegable>
        );
      })}

      <Enlace a="/historial" className="bloque-resueltas">
        <span>Resueltas: se archivan solas</span>
        <span className="bloque-resueltas__n">
          {resueltas} en los últimos 30 días <Icono nombre="flecha" tamano={16} />
        </span>
      </Enlace>
    </div>
  );
}
