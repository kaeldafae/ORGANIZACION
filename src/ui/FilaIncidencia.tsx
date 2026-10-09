import type { Incidencia } from '../domain/tipos';
import { tiempoRelativo } from '../domain/tiempo';
import { Enlace } from '../router/router';
import { EtiquetaEstado, EtiquetaPrioridad } from './Etiquetas';

export function FilaIncidencia({ inc, ahora }: { inc: Incidencia; ahora: Date }) {
  return (
    <li className="fila">
      <Enlace a={`/incidencia/${inc.id}`} className="fila__enlace">
        <span className="fila__etiquetas">
          <EtiquetaPrioridad prioridad={inc.prioridad} />
          <EtiquetaEstado estado={inc.estado} />
        </span>
        <span className="fila__titulo">
          {inc.titulo}
          {inc.habitacion && <span className="fila__hab"> · {inc.habitacion}</span>}
        </span>
        <span className="fila__meta">
          <span>{inc.asignado?.nombre ?? 'Sin asignar'}</span>
          <time dateTime={inc.creado}>{tiempoRelativo(inc.creado, ahora)}</time>
        </span>
      </Enlace>
    </li>
  );
}

export function ListaIncidencias({ items, ahora }: { items: Incidencia[]; ahora: Date }) {
  return (
    <ul className="lista">
      {items.map((i) => (
        <FilaIncidencia key={i.id} inc={i} ahora={ahora} />
      ))}
    </ul>
  );
}
