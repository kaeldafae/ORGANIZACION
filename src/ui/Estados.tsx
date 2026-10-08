import type { ReactNode } from 'react';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="estado-carga" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>;
}

export function BloqueError({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="bloque-error" role="alert">
      <p>{mensaje}</p>
      {reintentar && (
        <button type="button" className="boton" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
