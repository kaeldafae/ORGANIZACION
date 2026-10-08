import { useMemo } from 'react';
import { calcularDireccion } from '../domain/estadisticas';
import { puede } from '../domain/permisos';
import { ESTADO } from '../domain/valores';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { ListaIncidencias } from '../ui/FilaIncidencia';
import { Vacio } from '../ui/Estados';

function claseBarra(estado: string): string {
  if (estado === ESTADO.pendiente) return 'barra--rojo';
  if (estado === ESTADO.enCurso) return 'barra--ambar';
  return 'barra--verde';
}

export function Direccion() {
  const { abiertas, items, opciones, ahora } = useIncidencias();
  const { usuario } = useSesion();
  const datos = useMemo(
    () =>
      calcularDireccion(
        abiertas,
        items.filter((i) => i.estado === ESTADO.resuelto),
        opciones?.area ?? [],
        opciones?.estado ?? [],
        ahora,
      ),
    [abiertas, items, opciones, ahora],
  );

  if (!puede(usuario.rol, 'verDireccion')) {
    return (
      <div className="pagina">
        <h1 className="pagina__titulo">Dirección</h1>
        <p>Esta vista es solo para managers.</p>
      </div>
    );
  }

  return (
    <div className="pagina pagina--ancha">
      <h1 className="pagina__titulo">Dirección</h1>

      <ul className="kpis">
        <li className="kpi">
          <span className="kpi__n">{abiertas.length}</span>
          <span className="kpi__t">abiertas</span>
        </li>
        <li className={`kpi${datos.urgentesAbiertas.length > 0 ? ' kpi--alerta' : ''}`}>
          <span className="kpi__n">{datos.urgentesAbiertas.length}</span>
          <span className="kpi__t">urgentes abiertas</span>
        </li>
        <li className={`kpi${datos.antiguas.length > 0 ? ' kpi--aviso' : ''}`}>
          <span className="kpi__n">{datos.antiguas.length}</span>
          <span className="kpi__t">abiertas hace más de 7 días</span>
        </li>
        <li className="kpi">
          <span className="kpi__n">{datos.resueltas7}</span>
          <span className="kpi__t">resueltas en 7 días</span>
        </li>
        <li className="kpi">
          <span className="kpi__n">{datos.resueltas30}</span>
          <span className="kpi__t">resueltas en 30 días</span>
        </li>
      </ul>

      <section className="tarjeta" aria-labelledby="h-matriz">
        <h2 id="h-matriz" className="tarjeta__titulo">
          Por área y estado
        </h2>
        <p className="ayuda">Resueltas: últimos 30 días.</p>
        <table className="matriz">
          <caption className="sr-only">Incidencias por área y estado</caption>
          <thead>
            <tr>
              <th scope="col">Área</th>
              {(opciones?.estado ?? []).map((e) => (
                <th key={e} scope="col">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.matriz.map((fila) => (
              <tr key={fila.area}>
                <th scope="row">{fila.area}</th>
                {Object.entries(fila.porEstado).map(([estado, n]) => (
                  <td key={estado}>
                    <span className="celda">
                      <span className="celda__n">{n}</span>
                      <span className="barra" aria-hidden="true">
                        <span
                          className={`barra__relleno ${claseBarra(estado)}`}
                          style={{
                            width: `${String(datos.maximo ? (n / datos.maximo) * 100 : 0)}%`,
                          }}
                        />
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="dos-columnas">
        <section className="tarjeta" aria-labelledby="h-urg">
          <h2 id="h-urg" className="tarjeta__titulo">
            Urgentes abiertas
          </h2>
          {datos.urgentesAbiertas.length === 0 ? (
            <Vacio>No hay urgentes abiertas.</Vacio>
          ) : (
            <ListaIncidencias items={datos.urgentesAbiertas} ahora={ahora} />
          )}
        </section>
        <section className="tarjeta" aria-labelledby="h-ant">
          <h2 id="h-ant" className="tarjeta__titulo">
            Abiertas hace más de 7 días
          </h2>
          {datos.antiguas.length === 0 ? (
            <Vacio>Nada lleva más de una semana abierto.</Vacio>
          ) : (
            <ListaIncidencias items={datos.antiguas} ahora={ahora} />
          )}
        </section>
      </div>
    </div>
  );
}
