import { Suspense, lazy, useMemo, useState } from 'react';
import type { Config } from './config';
import type { Rol, Usuario } from './domain/tipos';
import { DemoRepository } from './data/demoRepository';
import { PERSONAS_DEMO } from './data/demoDatos';
import { SesionProvider } from './state/sesion';
import { AvisosProvider } from './state/avisos';
import { Router } from './router/router';
import { Cargando } from './ui/Estados';
import { App } from './App';

const ArranqueM365 = lazy(() => import('./ArranqueM365'));

export function Arranque({ config }: { config: Config }) {
  return (
    <AvisosProvider>
      <Router modo={config.modoRutas}>
        {config.demo ? (
          <ArranqueDemo config={config} />
        ) : 'errores' in config ? (
          <PantallaConfiguracion errores={config.errores} />
        ) : (
          <Suspense
            fallback={
              <main className="pantalla-centrada">
                <Cargando />
              </main>
            }
          >
            <ArranqueM365 config={config} m365={config.m365} />
          </Suspense>
        )}
      </Router>
    </AvisosProvider>
  );
}

function ArranqueDemo({ config }: { config: Config }) {
  const repo = useMemo(() => new DemoRepository(), []);
  const [rol, setRol] = useState<Rol>('manager');
  const yo = PERSONAS_DEMO[0];
  const usuario: Usuario = {
    nombre: yo?.nombre ?? 'Usuario demo',
    email: yo?.email ?? '',
    personaId: yo?.id ?? null,
    departamento: 'Mayordomía',
    rol,
  };
  return (
    <SesionProvider valor={{ usuario, demo: true, config, cambiarRol: setRol }}>
      <App repo={repo} />
    </SesionProvider>
  );
}

function PantallaConfiguracion({ errores }: { errores: string[] }) {
  return (
    <main className="pantalla-centrada">
      <div className="tarjeta">
        <h1 className="pagina__titulo">Falta configurar la app</h1>
        <p>Pasa este mensaje a IT. La guía está en el README, apartado «Guía para IT».</p>
        <ul>
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
