import { describe, expect, it } from 'vitest';
import { hayErrores, limpiarNueva, validarNueva } from '../src/domain/validacion';
import { OPCIONES_DEMO } from '../src/domain/valores';
import type { NuevaIncidencia } from '../src/domain/tipos';

const base: NuevaIncidencia = {
  titulo: 'Aire no enfría',
  area: 'Mayordomía',
  tipo: 'Incidencia',
  prioridad: 'Urgente',
  turno: 'Mañana',
  habitacion: '214',
  descripcion: '',
  asignadoId: null,
};

describe('validación del alta', () => {
  it('acepta un alta correcta', () => {
    expect(hayErrores(validarNueva(base, OPCIONES_DEMO))).toBe(false);
  });

  it('pide los campos obligatorios con mensajes claros', () => {
    const e = validarNueva({ ...base, titulo: ' ', area: '', tipo: '', turno: '' }, OPCIONES_DEMO);
    expect(e.titulo).toBe('Escribe un título corto.');
    expect(e.area).toBe('Elige el área.');
    expect(e.tipo).toBe('Elige el tipo.');
    expect(e.turno).toBe('Elige el turno.');
  });

  it('rechaza valores que no están en la lista', () => {
    expect(validarNueva({ ...base, area: 'Cocina' }, OPCIONES_DEMO).area).toMatch(/opción válida/);
  });

  it('limpia caracteres de control y recorta longitudes', () => {
    const l = limpiarNueva({
      ...base,
      titulo: `  Hola\u0000\nmundo${'x'.repeat(300)}`,
      habitacion: '2\u00071\t4',
      descripcion: 'a\r\nb\n\n\n\nc',
    });
    expect(l.titulo.startsWith('Hola mundo')).toBe(true);
    expect(l.titulo.length).toBe(120);
    expect(l.habitacion).toBe('21 4');
    expect(l.descripcion).toBe('a\nb\n\nc');
  });
});
