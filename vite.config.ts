import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Genera staticwebapp.config.json (Azure Static Web Apps) en la carpeta de salida.
 * La CSP necesita el dominio de SharePoint del tenant, que solo se conoce por
 * variable de entorno; por eso el archivo se crea al compilar y no se versiona.
 */
function staticWebAppConfig(env: Record<string, string>): Plugin {
  return {
    name: 'static-web-app-config',
    apply: 'build',
    generateBundle() {
      const demo = env.VITE_DEMO === 'true';
      const connect = ["'self'"];
      if (!demo) {
        const raw = env.VITE_SHAREPOINT_SITE_URL ?? '';
        let host: string;
        try {
          host = new URL(raw).host;
        } catch {
          throw new Error('VITE_SHAREPOINT_SITE_URL no es una URL válida.');
        }
        if (!/^[a-z0-9-]+\.sharepoint\.com$/i.test(host)) {
          throw new Error('VITE_SHAREPOINT_SITE_URL debe apuntar a <tenant>.sharepoint.com.');
        }
        connect.push(
          'https://login.microsoftonline.com',
          'https://graph.microsoft.com',
          `https://${host}`,
        );
      }
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' blob: data:",
        "font-src 'self'",
        `connect-src ${connect.join(' ')}`,
        demo ? "frame-src 'none'" : 'frame-src https://login.microsoftonline.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; ');

      const config = {
        navigationFallback: {
          rewrite: '/index.html',
          exclude: ['/assets/*', '/favicon.svg'],
        },
        globalHeaders: {
          'Content-Security-Policy': csp,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=(self)',
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
        routes: [
          {
            route: '/index.html',
            headers: { 'Cache-Control': 'no-cache' },
          },
          {
            route: '/assets/*',
            headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          },
        ],
        mimeTypes: { '.json': 'application/json' },
      };

      this.emitFile({
        type: 'asset',
        fileName: 'staticwebapp.config.json',
        source: `${JSON.stringify(config, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: mode === 'preview' ? './' : '/',
    plugins: [react(), staticWebAppConfig(env)],
    build: {
      target: 'es2022',
      sourcemap: false,
    },
  };
});
