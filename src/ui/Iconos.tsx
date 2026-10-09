interface PropsIcono {
  nombre: 'mas' | 'refrescar' | 'flecha' | 'menu' | 'cerrar' | 'avanzar' | 'camara' | 'buscar';
  tamano?: number;
}

const TRAZOS: Record<PropsIcono['nombre'], string> = {
  mas: 'M12 5v14M5 12h14',
  refrescar: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  flecha: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  avanzar: 'M5 12h14M13 6l6 6-6 6',
  camara: 'M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
};

/** Iconos decorativos: siempre acompañados de texto visible o sr-only. */
export function Icono({ nombre, tamano = 20 }: PropsIcono) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
