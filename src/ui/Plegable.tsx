import { useId, useState, type ReactNode } from 'react';

/** Bloque que se abre y cierra con un botón (accesible con teclado y lector de pantalla). */
export function Plegable({
  titulo,
  resumen,
  abiertoInicial,
  children,
  atenuado = false,
}: {
  titulo: ReactNode;
  resumen?: ReactNode;
  abiertoInicial: boolean;
  children: ReactNode;
  atenuado?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  return (
    <section className={`plegable${atenuado ? ' plegable--atenuado' : ''}`}>
      <h2 className="plegable__cabecera">
        <button
          type="button"
          className="plegable__boton"
          aria-expanded={abierto}
          aria-controls={id}
          onClick={() => setAbierto((a) => !a)}
        >
          <span className="plegable__chevron" aria-hidden="true" />
          <span className="plegable__titulo">{titulo}</span>
          {resumen && <span className="plegable__resumen">{resumen}</span>}
        </button>
      </h2>
      <div id={id} hidden={!abierto} className="plegable__contenido">
        {children}
      </div>
    </section>
  );
}
