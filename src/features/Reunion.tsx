import { useMemo } from 'react';
import { TIPO_REUNION } from '../domain/valores';
import { agruparPorArea } from '../domain/filtros';
import { useIncidencias } from '../state/incidencias';
import { useArea } from '../state/area';
import { Plegable } from '../ui/Plegable';
import { ListaIncidencias } from '../ui/FilaIncidencia';
import { Vacio } from '../ui/Estados';

/** Notas para reunión no resueltas, agrupadas por área. */
export function Reunion() {
  const { abiertas, opciones, ahora } = useIncidencias();
  const { area: miArea } = useArea();
  const grupos = useMemo(
    () =>
      agruparPorArea(
        abiertas.filter((i) => i.tipo === TIPO_REUNION),
        opciones?.area ?? [],
      ),
    [abiertas, opciones],
  );
  const total = [...grupos.values()].reduce((n, g) => n + g.length, 0);
  return (
    <div className="pagina">
      <h1 className="pagina__titulo">Para reunión</h1>
      <p className="pagina__ayuda">
        {total === 0
          ? 'No hay temas pendientes para la reunión.'
          : `${String(total)} temas pendientes.`}
      </p>
      {[...grupos.entries()].map(([area, lista]) => (
        <Plegable
          key={area}
          titulo={area}
          resumen={String(lista.length)}
          abiertoInicial={lista.length > 0 && (miArea === null || area === miArea)}
        >
          {lista.length === 0 ? (
            <Vacio>Sin temas de {area}.</Vacio>
          ) : (
            <ListaIncidencias items={lista} ahora={ahora} />
          )}
        </Plegable>
      ))}
    </div>
  );
}
