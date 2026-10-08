import { useEffect, useMemo, useState } from 'react';
import { MsalProvider, useMsal } from '@azure/msal-react';
import type { AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import type { Config, ConfigM365 } from './config';
import type { Usuario } from './domain/tipos';
import { crearMsal, crearObtenerToken, scopesInicio } from './auth/msal';
import { cargarUsuario } from './auth/usuario';
import { crearCliente } from './data/http';
import { GraphRepository } from './data/graphRepository';
import type { IncidenciasRepository } from './data/repositorio';
import { mensajeDe } from './data/errores';
import { SesionProvider } from './state/sesion';
import { BloqueError, Cargando } from './ui/Estados';
import { App } from './App';

/**
 * Arranque con Microsoft 365. Va en un módulo aparte para que MSAL solo se
 * descargue cuando la app funciona contra la lista real (no en modo demo).
 */
type EstadoInicio =
  | { fase: 'iniciando' }
  | { fase: 'sin-sesion' }
  | { fase: 'con-sesion'; cuenta: AccountInfo }
  | { fase: 'error'; mensaje: string };

export default function ArranqueM365({ config, m365 }: { config: Config; m365: ConfigM365 }) {
  const pca = useMemo(() => crearMsal(m365), [m365]);
  const [estado, setEstado] = useState<EstadoInicio>({ fase: 'iniciando' });

  useEffect(() => {
    const control = { vivo: true };
    (async () => {
      await pca.initialize();
      const resultado = await pca.handleRedirectPromise();
      const cuenta =
        resultado?.account ?? pca.getActiveAccount() ?? pca.getAllAccounts()[0] ?? null;
      if (!control.vivo) return;
      if (cuenta) {
        pca.setActiveAccount(cuenta);
        setEstado({ fase: 'con-sesion', cuenta });
      } else {
        setEstado({ fase: 'sin-sesion' });
      }
    })().catch(() => {
      if (control.vivo)
        setEstado({
          fase: 'error',
          mensaje: 'No se ha podido iniciar sesión. Vuelve a intentarlo.',
        });
    });
    return () => {
      control.vivo = false;
    };
  }, [pca]);

  return (
    <MsalProvider instance={pca}>
      {estado.fase === 'iniciando' && (
        <main className="pantalla-centrada">
          <Cargando texto="Comprobando tu sesión…" />
        </main>
      )}
      {estado.fase === 'sin-sesion' && <PantallaLogin m365={m365} />}
      {estado.fase === 'error' && (
        <main className="pantalla-centrada">
          <BloqueError mensaje={estado.mensaje} reintentar={() => window.location.reload()} />
        </main>
      )}
      {estado.fase === 'con-sesion' && (
        <ConSesion pca={pca} cuenta={estado.cuenta} config={config} m365={m365} />
      )}
    </MsalProvider>
  );
}

function PantallaLogin({ m365 }: { m365: ConfigM365 }) {
  const { instance } = useMsal();
  const [entrando, setEntrando] = useState(false);
  return (
    <main className="pantalla-centrada">
      <div className="tarjeta login">
        <h1 className="pagina__titulo">Incidencias del departamento</h1>
        <p>Entra con tu cuenta del hotel (la misma de Teams y Outlook).</p>
        <button
          type="button"
          className="boton boton--primario"
          disabled={entrando}
          onClick={() => {
            setEntrando(true);
            instance.loginRedirect({ scopes: scopesInicio(m365) }).catch(() => setEntrando(false));
          }}
        >
          {entrando ? 'Abriendo Microsoft…' : 'Entrar con mi cuenta'}
        </button>
      </div>
    </main>
  );
}

function ConSesion({
  pca,
  cuenta,
  config,
  m365,
}: {
  pca: PublicClientApplication;
  cuenta: AccountInfo;
  config: Config;
  m365: ConfigM365;
}) {
  const cliente = useMemo(() => crearCliente(crearObtenerToken(pca)), [pca]);
  const repo: IncidenciasRepository = useMemo(
    () => new GraphRepository(m365, cliente),
    [m365, cliente],
  );
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    repo
      .personas()
      .catch(() => [])
      .then((personas) => cargarUsuario(cuenta, m365, cliente, personas))
      .then((u) => {
        if (vivo) setUsuario(u);
      })
      .catch((e: unknown) => {
        if (vivo) setError(mensajeDe(e));
      });
    return () => {
      vivo = false;
    };
  }, [repo, cuenta, m365, cliente]);

  if (error) {
    return (
      <main className="pantalla-centrada">
        <BloqueError mensaje={error} reintentar={() => window.location.reload()} />
      </main>
    );
  }
  if (!usuario) {
    return (
      <main className="pantalla-centrada">
        <Cargando texto="Cargando tu perfil…" />
      </main>
    );
  }
  return (
    <SesionProvider
      valor={{
        usuario,
        demo: false,
        config,
        cerrarSesion: () => void pca.logoutRedirect({ account: cuenta }),
      }}
    >
      <App repo={repo} />
    </SesionProvider>
  );
}
