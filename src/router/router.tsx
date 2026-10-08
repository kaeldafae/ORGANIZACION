import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

type Modo = 'path' | 'hash';

interface ContextoRouter {
  ruta: string;
  navegar: (destino: string, opciones?: { reemplazar?: boolean }) => void;
  href: (destino: string) => string;
}

const Ctx = createContext<ContextoRouter | null>(null);

function leer(modo: Modo): string {
  if (modo === 'hash') {
    const h = window.location.hash.replace(/^#/, '');
    return h.startsWith('/') ? h : '/';
  }
  return window.location.pathname || '/';
}

/**
 * Router mínimo sin dependencias. "path" usa rutas normales (Azure Static Web Apps
 * reescribe a index.html); "hash" sirve para alojamientos estáticos sin reescritura.
 */
export function Router({ modo, children }: { modo: Modo; children: ReactNode }) {
  const [ruta, setRuta] = useState(() => leer(modo));

  useEffect(() => {
    const actualizar = () => setRuta(leer(modo));
    window.addEventListener('popstate', actualizar);
    window.addEventListener('hashchange', actualizar);
    return () => {
      window.removeEventListener('popstate', actualizar);
      window.removeEventListener('hashchange', actualizar);
    };
  }, [modo]);

  const href = useCallback(
    (destino: string) => (modo === 'hash' ? `#${destino}` : destino),
    [modo],
  );

  const navegar = useCallback<ContextoRouter['navegar']>(
    (destino, opciones) => {
      const url = href(destino);
      if (opciones?.reemplazar) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
      setRuta(destino);
      window.scrollTo({ top: 0 });
    },
    [href],
  );

  const valor = useMemo(() => ({ ruta, navegar, href }), [ruta, navegar, href]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useRouter(): ContextoRouter {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRouter fuera de <Router>');
  return c;
}

type PropsEnlace = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { a: string };

/** Enlace interno: navega sin recargar, pero mantiene clic central / Ctrl+clic. */
export function Enlace({ a, onClick, ...resto }: PropsEnlace) {
  const { navegar, href, ruta } = useRouter();
  const manejar = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    navegar(a);
  };
  return (
    <a {...resto} href={href(a)} onClick={manejar} aria-current={ruta === a ? 'page' : undefined} />
  );
}
