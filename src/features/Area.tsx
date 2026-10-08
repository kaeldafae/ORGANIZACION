import { useMemo, useState, type DragEvent } from 'react';
import type { Incidencia } from '../domain/tipos';
import { ESTADO, FLUJO_ESTADOS, MS_DIA } from '../domain/valores';
import { ordenarPorPrioridad, siguienteEstado } from '../domain/filtros';
import { haceMenosDe, tiempoRelativo } from '../domain/tiempo';
import { puede } from '../domain/permisos';
import { slug } from '../domain/texto';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { Enlace } from '../router/router';
import { EtiquetaPrioridad } from '../ui/Etiquetas';
import { Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { NoEncontrada } from './NoEncontrada';

const TIPO_ARRASTRE = 'application/x-incidencia';

function puedeArrastrar(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
}

export function Area({ slugArea }: { slugArea: string }) {
  const { items, opciones, moverEstado, ahora } = useIncidencias();
  const { usuario } = useSesion();
  const [sobre, setSobre] = useState<string | null>(null);
  const area = opciones?.area.find((a) => slug(a) === slugArea);
  const arrastre = useMemo(() => puedeArrastrar(), []);
  const permitido = puede(usuario.rol, 'moverEstado');

  const columnas = useMemo(() => {
    const deArea = items.filter((i) => i.area === area);
    return FLUJO_ESTADOS.map((estado) => ({
      estado,
      items: deArea
        .filter(
          (i) =>
            i.estado === estado &&
            (estado !== ESTADO.resuelto ||
              (i.fechaResolucion !== null && haceMenosDe(i.fechaResolucion, MS_DIA, ahora))),
        )
        .sort(ordenarPorPrioridad),
    }));
  }, [items, area, ahora]);

  if (!area) return <NoEncontrada />;

  const soltar = (estado: string) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData(TIPO_ARRASTRE);
    const inc = items.find((i) => i.id === id);
    if (inc && inc.estado !== estado) void moverEstado(id, estado).catch(() => undefined);
  };

  return (
    <div className="pagina pagina--ancha">
      <h1 className="pagina__titulo">{area}</h1>
      <p className="pagina__ayuda">
        {arrastre && permitido
          ? 'Arrastra una tarjeta a otra columna o usa su botón para avanzar.'
          : 'Usa el botón de cada tarjeta para avanzar su estado.'}
      </p>
      <div className="tablero">
        {columnas.map((col) => (
          <section
            key={col.estado}
            className={`columna${sobre === col.estado ? ' columna--sobre' : ''}`}
            aria-labelledby={`col-${slug(col.estado)}`}
            onDragOver={
              arrastre && permitido
                ? (e) => {
                    if (e.dataTransfer.types.includes(TIPO_ARRASTRE)) {
                      e.preventDefault();
                      setSobre(col.estado);
                    }
                  }
                : undefined
            }
            onDragLeave={() => setSobre((s) => (s === col.estado ? null : s))}
            onDrop={arrastre && permitido ? soltar(col.estado) : undefined}
          >
            <h2 id={`col-${slug(col.estado)}`} className="columna__titulo">
              {col.estado}
              <span className="columna__n">{col.items.length}</span>
            </h2>
            {col.estado === ESTADO.resuelto && (
              <p className="columna__nota">Solo las de las últimas 24 h.</p>
            )}
            {col.items.length === 0 ? (
              <Vacio>
                {col.estado === ESTADO.resuelto
                  ? 'Nada resuelto en las últimas 24 h.'
                  : `No hay nada ${col.estado.toLowerCase()} en ${area}.`}
              </Vacio>
            ) : (
              <ul className="columna__lista">
                {col.items.map((inc) => (
                  <Tarjeta
                    key={inc.id}
                    inc={inc}
                    ahora={ahora}
                    arrastrable={arrastre && permitido}
                    permitido={permitido}
                    avanzar={(estado) => void moverEstado(inc.id, estado).catch(() => undefined)}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Tarjeta({
  inc,
  ahora,
  arrastrable,
  permitido,
  avanzar,
}: {
  inc: Incidencia;
  ahora: Date;
  arrastrable: boolean;
  permitido: boolean;
  avanzar: (estado: string) => void;
}) {
  const siguiente = siguienteEstado(inc.estado, FLUJO_ESTADOS);
  return (
    <li
      className="tarjeta-tablero"
      draggable={arrastrable}
      onDragStart={(e) => {
        e.dataTransfer.setData(TIPO_ARRASTRE, inc.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="tarjeta-tablero__cabecera">
        <EtiquetaPrioridad prioridad={inc.prioridad} />
        <time dateTime={inc.creado}>{tiempoRelativo(inc.creado, ahora)}</time>
      </div>
      <Enlace a={`/incidencia/${inc.id}`} className="tarjeta-tablero__titulo">
        {inc.titulo}
      </Enlace>
      <p className="tarjeta-tablero__meta">
        {inc.habitacion && <span>{inc.habitacion} · </span>}
        {inc.asignado?.nombre ?? 'Sin asignar'}
      </p>
      {siguiente && permitido && (
        <button
          type="button"
          className="boton boton--secundario boton--bloque"
          onClick={() => avanzar(siguiente)}
        >
          <Icono nombre="avanzar" tamano={18} />
          {siguiente === ESTADO.resuelto ? 'Marcar resuelta' : `Avanzar a ${siguiente}`}
          <span className="sr-only">: {inc.titulo}</span>
        </button>
      )}
    </li>
  );
}
