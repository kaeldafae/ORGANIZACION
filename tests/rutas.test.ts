import { describe, expect, it } from 'vitest';
import { resolverRuta } from '../src/router/rutas';
import { leerConfig } from '../src/config';

describe('rutas', () => {
  it('resuelve las pantallas', () => {
    expect(resolverRuta('/')).toEqual({ nombre: 'inicio' });
    expect(resolverRuta('/area/mayordomia')).toEqual({ nombre: 'area', slug: 'mayordomia' });
    expect(resolverRuta('/incidencia/12/')).toEqual({ nombre: 'detalle', id: '12' });
    expect(resolverRuta('/nuevo')).toEqual({ nombre: 'nuevo' });
    expect(resolverRuta('/xyz')).toEqual({ nombre: 'no-encontrada' });
    expect(resolverRuta('/incidencia/<script>')).toEqual({ nombre: 'no-encontrada' });
  });
});

describe('configuración', () => {
  const valida = {
    VITE_TENANT_ID: '11111111-2222-3333-4444-555555555555',
    VITE_CLIENT_ID: '11111111-2222-3333-4444-666666666666',
    VITE_MANAGERS_GROUP_ID: '11111111-2222-3333-4444-777777777777',
    VITE_SHAREPOINT_SITE_URL: 'https://contoso.sharepoint.com/sites/Equipo/',
    VITE_LIST_NAME: 'Incidencias del departamento',
  };

  it('modo demo no exige nada más', () => {
    expect(leerConfig({ VITE_DEMO: 'true' }, 'https://app').demo).toBe(true);
  });

  it('lista lo que falta en producción', () => {
    const c = leerConfig({}, 'https://app');
    expect('errores' in c && c.errores.length).toBe(5);
  });

  it('construye la configuración de Microsoft 365', () => {
    const c = leerConfig(valida, 'https://app.example');
    if (c.demo || !('m365' in c)) throw new Error('debería ser válida');
    expect(c.m365.siteHost).toBe('contoso.sharepoint.com');
    expect(c.m365.sitePath).toBe('/sites/Equipo');
    expect(c.m365.redirectUri).toBe('https://app.example');
    expect(c.m365.graphSitesScope).toBe('https://graph.microsoft.com/Sites.ReadWrite.All');
    expect(c.m365.sharePointScope).toBe('https://contoso.sharepoint.com/AllSites.Write');
  });

  it('rechaza dominios que no son de SharePoint', () => {
    const c = leerConfig(
      { ...valida, VITE_SHAREPOINT_SITE_URL: 'https://evil.example/sites/x' },
      'x',
    );
    expect('errores' in c).toBe(true);
  });

  it('acepta Sites.Selected y una zona horaria válida', () => {
    const c = leerConfig(
      { ...valida, VITE_GRAPH_SITES_SCOPE: 'Sites.Selected', VITE_TIMEZONE: 'Atlantic/Canary' },
      'x',
    );
    if (c.demo || !('m365' in c)) throw new Error('debería ser válida');
    expect(c.m365.graphSitesScope).toBe('https://graph.microsoft.com/Sites.Selected');
    expect(c.zona).toBe('Atlantic/Canary');
  });
});
