import { useMemo } from 'react';
import { MS_DIA } from '../domain/valores';
import { agruparPorArea } from '../domain/filtros';
import { haceMenosDe } from '../domain/tiempo';
import { useIncidencias } from '../state/incidencias';
import { Plegable } from '../ui/Plegable';
import { ListaIncidencias } from '../ui/FilaIncidencia';
import { Vacio } from '../ui/Estados';

/** Lo creado en las últimas 24 h, agrupado por área y plegado. */
export function Traspaso() {
  const { items, opciones, ahora } = useIncidencias();
  const grupos = useMemo(
    () =>
      agruparPorArea(
        items.filter((i) => haceMenosDe(i.creado, MS_DIA, ahora)),
        opciones?.area ?? [],
      ),
    [items, opciones, ahora],
  );
  return (
    <div className="pagina">
      <h1 className="pagina__titulo">Traspaso de turno</h1>
      <p className="pagina__ayuda">Todo lo creado en las últimas 24 horas.</p>
      {[...grupos.entries()].map(([area, lista]) => (
        <Plegable
          key={area}
          titulo={area}
          resumen={`${String(lista.length)} en 24 h`}
          abiertoInicial={false}
        >
          {lista.length === 0 ? (
            <Vacio>Nada nuevo en {area} en las últimas 24 h.</Vacio>
          ) : (
            <ListaIncidencias items={lista} ahora={ahora} />
          )}
        </Plegable>
      ))}
    </div>
  );
}
