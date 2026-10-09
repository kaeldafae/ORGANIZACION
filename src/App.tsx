import { useEffect, useRef, useState } from 'react';
import type { IncidenciasRepository } from './data/repositorio';
import type { Rol } from './domain/tipos';
import { puede } from './domain/permisos';
import { slug } from './domain/texto';
import { IncidenciasProvider, useIncidencias } from './state/incidencias';
import { useSesion } from './state/sesion';
import { AreaProvider, useArea } from './state/area';
import { Enlace, useRouter } from './router/router';
import { resolverRuta } from './router/rutas';
import { BloqueError, Cargando } from './ui/Estados';
import { Icono } from './ui/Iconos';
import { Inicio } from './features/Inicio';
import { Area } from './features/Area';
import { Detalle } from './features/Detalle';
import { Nuevo } from './features/Nuevo';
import { Traspaso } from './features/Traspaso';
import { Reunion } from './features/Reunion';
import { Direccion } from './features/Direccion';
import { Historial } from './features/Historial';
import { NoEncontrada } from './features/NoEncontrada';

export function App({ repo }: { repo: IncidenciasRepository }) {
  return (
    <IncidenciasProvider repo={repo}>
      <Armazon />
    </IncidenciasProvider>
  );
}

function Armazon() {
  const { fase, error, refrescar, opciones } = useIncidencias();
  const { usuario } = useSesion();

  if (fase === 'cargando') {
    return (
      <main className="pantalla-centrada">
        <Cargando texto="Cargando incidencias…" />
      </main>
    );
  }
  if (fase === 'error' || !opciones) {
    return (
      <main className="pantalla-centrada">
        <BloqueError
          mensaje={error ?? 'No se han podido cargar los datos.'}
          reintentar={() => window.location.reload()}
        />
        <button type="button" className="boton boton--secundario" onClick={() => void refrescar()}>
          Volver a intentar sin recargar
        </button>
      </main>
    );
  }
  return (
    <AreaProvider areas={opciones.area} departamento={usuario.departamento}>
      <Estructura />
    </AreaProvider>
  );
}

function Estructura() {
  const { ruta } = useRouter();
  const r = resolverRuta(ruta);
  const principal = useRef<HTMLElement>(null);
  const primera = useRef(true);

  // Al cambiar de pantalla, llevar el foco al contenido (lectores de pantalla y teclado).
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    principal.current?.focus();
  }, [ruta]);

  return (
    <div className="app">
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <BannerDemo />
      <Cabecera />
      <main id="contenido" ref={principal} tabIndex={-1} className="contenido">
        <Pagina r={r} />
      </main>
      {r.nombre !== 'nuevo' && (
        <Enlace a="/nuevo" className="boton-nuevo">
          <Icono nombre="mas" />
          <span>Nuevo</span>
        </Enlace>
      )}
    </div>
  );
}

function Pagina({ r }: { r: ReturnType<typeof resolverRuta> }) {
  switch (r.nombre) {
    case 'inicio':
      return <Inicio />;
    case 'area':
      return <Area key={r.slug} slugArea={r.slug} />;
    case 'detalle':
      return <Detalle key={r.id} id={r.id} />;
    case 'nuevo':
      return <Nuevo />;
    case 'traspaso':
      return <Traspaso />;
    case 'reunion':
      return <Reunion />;
    case 'direccion':
      return <Direccion />;
    case 'historial':
      return <Historial />;
    case 'no-encontrada':
      return <NoEncontrada />;
  }
}

function BannerDemo() {
  const { demo, usuario, cambiarRol } = useSesion();
  if (!demo) return null;
  return (
    <div className="banner-demo" role="note">
      <strong>Modo demo</strong>
      <span className="banner-demo__texto">
        Datos de ejemplo. Los cambios se pierden al recargar.
      </span>
      {cambiarRol && (
        <label className="banner-demo__rol">
          Simular
          <select value={usuario.rol} onChange={(e) => cambiarRol(e.target.value as Rol)}>
            <option value="manager">Manager</option>
            <option value="equipo">Equipo</option>
          </select>
        </label>
      )}
    </div>
  );
}

function Cabecera() {
  const { opciones, refrescar, refrescando } = useIncidencias();
  const { usuario, cerrarSesion } = useSesion();
  const { area, elegir } = useArea();
  const { ruta } = useRouter();
  // El menú móvil queda abierto solo en la pantalla donde se abrió: al navegar se cierra.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === ruta;

  const enlaces: { a: string; texto: string }[] = [
    { a: '/', texto: 'Inicio' },
    ...(opciones?.area ?? []).map((ar) => ({ a: `/area/${slug(ar)}`, texto: ar })),
    { a: '/traspaso', texto: 'Traspaso de turno' },
    { a: '/reunion', texto: 'Para reunión' },
    { a: '/historial', texto: 'Historial' },
    ...(puede(usuario.rol, 'verDireccion') ? [{ a: '/direccion', texto: 'Dirección' }] : []),
  ];

  return (
    <header className="cabecera">
      <div className="cabecera__barra">
        <Enlace a="/" className="marca">
          Incidencias
        </Enlace>
        <div className="cabecera__acciones">
          <button
            type="button"
            className="boton-icono"
            onClick={() => void refrescar()}
            disabled={refrescando}
            aria-label={refrescando ? 'Actualizando' : 'Actualizar ahora'}
            title="Actualizar ahora"
          >
            <span className={refrescando ? 'girando' : undefined}>
              <Icono nombre="refrescar" />
            </span>
          </button>
          <button
            type="button"
            className="boton-icono cabecera__menu"
            aria-expanded={abierto}
            aria-controls="navegacion"
            onClick={() => setAbiertoEn(abierto ? null : ruta)}
          >
            <Icono nombre={abierto ? 'cerrar' : 'menu'} />
            <span className="sr-only">Menú</span>
          </button>
        </div>
      </div>
      <nav
        id="navegacion"
        aria-label="Principal"
        className={`nav${abierto ? ' nav--abierta' : ''}`}
      >
        <ul>
          {enlaces.map((e) => (
            <li key={e.a}>
              <Enlace a={e.a} className="nav__enlace">
                {e.texto}
              </Enlace>
            </li>
          ))}
        </ul>
        <div className="nav__usuario">
          <p className="nav__nombre">
            {usuario.nombre}
            <span className="nav__rol">{usuario.rol === 'manager' ? 'Manager' : 'Equipo'}</span>
          </p>
          <label className="nav__area">
            Mi área
            <select value={area ?? ''} onChange={(e) => elegir(e.target.value)}>
              {!area && <option value="">Elige…</option>}
              {(opciones?.area ?? []).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          {cerrarSesion && (
            <button type="button" className="boton boton--secundario" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
