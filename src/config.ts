import { parsearFranjas, type FranjaTurno } from './domain/turnos';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CERO = '00000000-0000-0000-0000-000000000000';

export interface ConfigComun {
  zona: string;
  franjas: readonly FranjaTurno[];
  maxFotoBytes: number;
  modoRutas: 'path' | 'hash';
}

export interface ConfigM365 {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  siteUrl: string;
  siteHost: string;
  sitePath: string;
  listName: string;
  managersGroupId: string;
  graphSitesScope: string;
  sharePointScope: string;
}

export type Config =
  | ({ demo: true } & ConfigComun)
  | ({ demo: false; m365: ConfigM365 } & ConfigComun)
  | ({ demo: false; errores: string[] } & ConfigComun);

function zonaValida(z: string | undefined): string {
  const zona = z?.trim() || 'Europe/Madrid';
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: zona });
    return zona;
  } catch {
    return 'Europe/Madrid';
  }
}

/** Solo las variables VITE_* (permite probar la lectura sin el resto de import.meta.env). */
export type Entorno = {
  readonly [K in keyof ImportMetaEnv as K extends `VITE_${string}` ? K : never]?: string;
};

export function leerConfig(env: Entorno, origen: string): Config {
  const mb = Number(env.VITE_MAX_FOTO_MB ?? '5');
  const comun: ConfigComun = {
    zona: zonaValida(env.VITE_TIMEZONE),
    franjas: parsearFranjas(env.VITE_TURNOS),
    maxFotoBytes: Math.round((Number.isFinite(mb) && mb > 0 && mb <= 50 ? mb : 5) * 1024 * 1024),
    modoRutas: env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'path',
  };
  if (env.VITE_DEMO === 'true') return { demo: true, ...comun };

  const errores: string[] = [];
  const guid = (nombre: string, valor: string | undefined) => {
    const v = valor?.trim() ?? '';
    if (!GUID.test(v) || v === CERO)
      errores.push(`${nombre} falta o no es un identificador válido.`);
    return v;
  };
  const tenantId = guid('VITE_TENANT_ID', env.VITE_TENANT_ID);
  const clientId = guid('VITE_CLIENT_ID', env.VITE_CLIENT_ID);
  const managersGroupId = guid('VITE_MANAGERS_GROUP_ID', env.VITE_MANAGERS_GROUP_ID);

  let siteHost = '';
  let sitePath = '';
  const siteUrl = (env.VITE_SHAREPOINT_SITE_URL ?? '').trim().replace(/\/+$/, '');
  try {
    const u = new URL(siteUrl);
    if (u.protocol !== 'https:' || !/^[a-z0-9-]+\.sharepoint\.com$/i.test(u.host))
      throw new Error();
    siteHost = u.host;
    sitePath = u.pathname.replace(/\/+$/, '');
  } catch {
    errores.push(
      'VITE_SHAREPOINT_SITE_URL debe ser https://<empresa>.sharepoint.com/sites/<sitio>.',
    );
  }

  const listName = (env.VITE_LIST_NAME ?? '').trim();
  if (!listName) errores.push('VITE_LIST_NAME está vacío.');

  const scope = (env.VITE_GRAPH_SITES_SCOPE ?? '').trim() || 'Sites.ReadWrite.All';
  if (scope !== 'Sites.ReadWrite.All' && scope !== 'Sites.Selected')
    errores.push('VITE_GRAPH_SITES_SCOPE debe ser Sites.ReadWrite.All o Sites.Selected.');

  if (errores.length > 0) return { demo: false, errores, ...comun };

  return {
    demo: false,
    ...comun,
    m365: {
      tenantId,
      clientId,
      redirectUri: (env.VITE_REDIRECT_URI ?? '').trim() || origen,
      siteUrl,
      siteHost,
      sitePath,
      listName,
      managersGroupId,
      graphSitesScope: `https://graph.microsoft.com/${scope}`,
      sharePointScope:
        (env.VITE_SHAREPOINT_SCOPE ?? '').trim() || `https://${siteHost}/AllSites.Write`,
    },
  };
}

export const config: Config = leerConfig(import.meta.env, window.location.origin);
