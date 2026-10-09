import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser';
import type { ConfigM365 } from '../config';
import { AppError } from '../data/errores';
import type { ObtenerToken } from '../data/http';

export const SCOPE_PERFIL = 'User.Read';

export function crearMsal(cfg: ConfigM365): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: cfg.redirectUri,
      postLogoutRedirectUri: cfg.redirectUri,
    },
    cache: {
      // La sesión se borra al cerrar la pestaña: adecuado para equipos compartidos.
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  });
}

/** Permisos que se piden al iniciar sesión (Graph). El de SharePoint se pide al adjuntar fotos. */
export function scopesInicio(cfg: ConfigM365): string[] {
  return [SCOPE_PERFIL, cfg.graphSitesScope];
}

/**
 * Obtiene tokens en silencio; si Microsoft pide volver a iniciar sesión o aceptar
 * un permiso nuevo, redirige a la pantalla de login.
 */
export function crearObtenerToken(pca: PublicClientApplication): ObtenerToken {
  return async (scopes) => {
    const account: AccountInfo | null = pca.getActiveAccount() ?? pca.getAllAccounts()[0] ?? null;
    if (!account) throw new AppError('permiso', 'Tu sesión ha caducado. Vuelve a entrar.');
    try {
      const r = await pca.acquireTokenSilent({ scopes, account });
      return r.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await pca.acquireTokenRedirect({ scopes, account });
        throw new AppError('permiso', 'Hay que volver a iniciar sesión. Redirigiendo…');
      }
      throw new AppError('permiso', 'No se ha podido validar tu sesión. Vuelve a entrar.');
    }
  };
}
