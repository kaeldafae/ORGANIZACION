/** Minúsculas, sin tildes y con espacios colapsados: para buscar y comparar nombres. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Identificador de URL a partir de un nombre ("Mayordomía" → "mayordomia"). */
export function slug(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Quita caracteres de control salvo tabulador, salto de línea y retorno de carro. */
function sinControl(texto: string): string {
  let out = '';
  for (const c of texto) {
    const n = c.codePointAt(0) ?? 0;
    const control = (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 127;
    if (!control) out += c;
  }
  return out;
}

/** Limpia texto de una línea: sin caracteres de control ni saltos, recortado y limitado. */
export function limpiarLinea(texto: string, max: number): string {
  return sinControl(texto)
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Limpia texto multilínea: conserva saltos de línea, normaliza CRLF y limita la longitud. */
export function limpiarMultilinea(texto: string, max: number): string {
  return sinControl(texto)
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}
