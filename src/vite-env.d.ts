/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO?: string;
  readonly VITE_TENANT_ID?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_REDIRECT_URI?: string;
  readonly VITE_SHAREPOINT_SITE_URL?: string;
  readonly VITE_LIST_NAME?: string;
  readonly VITE_MANAGERS_GROUP_ID?: string;
  readonly VITE_GRAPH_SITES_SCOPE?: string;
  readonly VITE_SHAREPOINT_SCOPE?: string;
  readonly VITE_TIMEZONE?: string;
  readonly VITE_TURNOS?: string;
  readonly VITE_MAX_FOTO_MB?: string;
  readonly VITE_ROUTER_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
