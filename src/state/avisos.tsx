import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type TipoAviso = 'exito' | 'error' | 'info';
interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

interface ContextoAvisos {
  avisar: (texto: string, tipo?: TipoAviso) => void;
}

const Ctx = createContext<ContextoAvisos | null>(null);
const DURACION_MS = 5000;

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(1);

  const quitar = useCallback((id: number) => {
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);

  const avisar = useCallback(
    (texto: string, tipo: TipoAviso = 'info') => {
      const id = siguiente.current++;
      setAvisos((a) => [...a.slice(-2), { id, tipo, texto }]);
      window.setTimeout(() => quitar(id), tipo === 'error' ? DURACION_MS * 2 : DURACION_MS);
    },
    [quitar],
  );

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso aviso--${a.tipo}`}>
            <span>{a.texto}</span>
            <button type="button" className="aviso__cerrar" onClick={() => quitar(a.id)}>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Cerrar aviso</span>
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useAvisos(): ContextoAvisos {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAvisos fuera de <AvisosProvider>');
  return c;
}
