import { horaEnZona } from './tiempo';

export interface FranjaTurno {
  turno: string;
  inicio: number; // 0-23
  fin: number; // 1-24; si fin <= inicio la franja cruza medianoche
}

export const FRANJAS_POR_DEFECTO: readonly FranjaTurno[] = [
  { turno: 'Mañana', inicio: 7, fin: 15 },
  { turno: 'Tarde', inicio: 15, fin: 23 },
  { turno: 'Noche', inicio: 23, fin: 7 },
];

/**
 * Lee las franjas de "Mañana=7-15,Tarde=15-23,Noche=23-7".
 * Si el texto no es válido o deja horas sin cubrir, devuelve las franjas por defecto.
 */
export function parsearFranjas(texto: string | undefined): readonly FranjaTurno[] {
  if (!texto?.trim()) return FRANJAS_POR_DEFECTO;
  const franjas: FranjaTurno[] = [];
  for (const trozo of texto.split(',')) {
    const m = /^\s*([^=]+?)\s*=\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/.exec(trozo);
    if (!m?.[1] || !m[2] || !m[3]) return FRANJAS_POR_DEFECTO;
    const inicio = Number(m[2]);
    const fin = Number(m[3]);
    if (inicio > 23 || fin > 24 || inicio === fin) return FRANJAS_POR_DEFECTO;
    franjas.push({ turno: m[1], inicio, fin });
  }
  for (let h = 0; h < 24; h++) {
    if (!franjas.some((f) => dentro(h, f))) return FRANJAS_POR_DEFECTO;
  }
  return franjas;
}

function dentro(hora: number, f: FranjaTurno): boolean {
  return f.inicio < f.fin ? hora >= f.inicio && hora < f.fin : hora >= f.inicio || hora < f.fin;
}

export function turnoParaHora(hora: number, franjas: readonly FranjaTurno[]): string | null {
  return franjas.find((f) => dentro(hora, f))?.turno ?? null;
}

export function turnoActual(
  ahora: Date,
  zona: string,
  franjas: readonly FranjaTurno[],
): string | null {
  return turnoParaHora(horaEnZona(ahora, zona), franjas);
}
