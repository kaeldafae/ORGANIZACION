import type { NuevaIncidencia, OpcionesLista } from './tipos';
import { LIMITES } from './valores';
import { limpiarLinea, limpiarMultilinea } from './texto';

export type ErroresFormulario = Partial<Record<keyof NuevaIncidencia, string>>;

/** Limpia los campos de texto (sin caracteres de control y con longitud limitada). */
export function limpiarNueva(datos: NuevaIncidencia): NuevaIncidencia {
  return {
    ...datos,
    titulo: limpiarLinea(datos.titulo, LIMITES.titulo),
    habitacion: limpiarLinea(datos.habitacion, LIMITES.habitacion),
    descripcion: limpiarMultilinea(datos.descripcion, LIMITES.descripcion),
  };
}

function eleccion(valor: string, opciones: readonly string[], campo: string): string | undefined {
  if (!valor) return `Elige ${campo}.`;
  if (!opciones.includes(valor)) return `Elige una opción válida de ${campo}.`;
  return undefined;
}

export function validarNueva(datos: NuevaIncidencia, opciones: OpcionesLista): ErroresFormulario {
  const e: ErroresFormulario = {};
  const titulo = datos.titulo.trim();
  if (!titulo) e.titulo = 'Escribe un título corto.';
  else if (titulo.length < 3) e.titulo = 'El título es demasiado corto.';
  else if (titulo.length > LIMITES.titulo) e.titulo = `Máximo ${LIMITES.titulo} caracteres.`;

  const area = eleccion(datos.area, opciones.area, 'el área');
  if (area) e.area = area;
  const tipo = eleccion(datos.tipo, opciones.tipo, 'el tipo');
  if (tipo) e.tipo = tipo;
  const prioridad = eleccion(datos.prioridad, opciones.prioridad, 'la prioridad');
  if (prioridad) e.prioridad = prioridad;
  const turno = eleccion(datos.turno, opciones.turno, 'el turno');
  if (turno) e.turno = turno;

  if (datos.habitacion.length > LIMITES.habitacion)
    e.habitacion = `Máximo ${LIMITES.habitacion} caracteres.`;
  if (datos.descripcion.length > LIMITES.descripcion)
    e.descripcion = `Máximo ${LIMITES.descripcion} caracteres.`;
  return e;
}

export function hayErrores(e: ErroresFormulario): boolean {
  return Object.values(e).some(Boolean);
}
