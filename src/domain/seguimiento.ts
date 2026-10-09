import type { NotaSeguimiento } from './tipos';
import { LIMITES } from './valores';
import { limpiarLinea, limpiarMultilinea } from './texto';

/**
 * Formato en la columna "Seguimiento" (texto plano, legible también desde la lista):
 *
 *   [2026-10-08T08:15:00Z | Ana Ruiz]
 *   Texto de la nota, puede tener
 *   varias líneas.
 *
 * Las notas se añaden al final y nunca se reescriben las anteriores.
 */
const CABECERA = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) \| ([^\]\n]+)\]$/;

export function parsearSeguimiento(texto: string): NotaSeguimiento[] {
  const notas: NotaSeguimiento[] = [];
  let actual: NotaSeguimiento | null = null;
  const lineas: string[] = [];

  const cerrar = () => {
    if (actual) notas.push({ ...actual, texto: lineas.join('\n').trim() });
    lineas.length = 0;
  };

  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const m = CABECERA.exec(linea);
    if (m?.[1] && m[2]) {
      cerrar();
      actual = { fecha: m[1], autor: m[2], texto: '' };
    } else if (actual) {
      lineas.push(linea);
    } else if (linea.trim()) {
      // Texto escrito a mano en la lista antes de usar la app: se conserva como nota sin autor.
      actual = { fecha: '', autor: 'Sin autor', texto: '' };
      lineas.push(linea);
    }
  }
  cerrar();
  return notas;
}

/** Fecha ISO sin milisegundos, como en la cabecera. */
function isoSegundos(fecha: Date): string {
  return `${fecha.toISOString().slice(0, 19)}Z`;
}

export class SeguimientoLlenoError extends Error {
  constructor() {
    super('El seguimiento ha alcanzado el tamaño máximo.');
    this.name = 'SeguimientoLlenoError';
  }
}

/**
 * Devuelve el texto completo con la nota nueva al final.
 * Una línea del texto que imite una cabecera se neutraliza para que no se pueda
 * falsear la autoría de una nota.
 */
export function anadirNota(existente: string, texto: string, autor: string, fecha: Date): string {
  const limpio = limpiarMultilinea(texto, LIMITES.nota)
    .split('\n')
    .map((l) => (CABECERA.test(l) ? ` ${l}` : l))
    .join('\n');
  if (!limpio) throw new Error('La nota está vacía.');
  const nombre =
    limpiarLinea(autor, 80).replace(/[\]|]/g, '').replace(/\s+/g, ' ').trim() || 'Sin nombre';
  const bloque = `[${isoSegundos(fecha)} | ${nombre}]\n${limpio}`;
  const base = existente.trimEnd();
  const resultado = base ? `${base}\n\n${bloque}` : bloque;
  if (resultado.length > LIMITES.seguimientoTotal) throw new SeguimientoLlenoError();
  return resultado;
}
