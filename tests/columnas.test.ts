import { describe, expect, it } from 'vitest';
import { construirMapa, ErrorColumnas, type ColumnaGraph } from '../src/data/columnas';

const eleccion = (name: string, displayName: string, choices: string[]): ColumnaGraph => ({
  name,
  displayName,
  choice: { choices },
});

function columnasValidas(): ColumnaGraph[] {
  return [
    { name: 'Title', displayName: 'Título', text: {} },
    { name: 'LinkTitle', displayName: 'Título', readOnly: true, text: {} },
    eleccion('_x00c1_rea', 'Área', ['Mayordomía', 'Recepción', 'Botones', 'General']),
    eleccion('Tipo', 'Tipo', ['Incidencia', 'Nota para reunión']),
    eleccion('Prioridad', 'Prioridad', ['Urgente', 'Normal', 'Baja']),
    eleccion('Turno', 'Turno', ['Mañana', 'Tarde', 'Noche']),
    { name: 'Habitaci_x00f3_n', displayName: 'Habitación', text: {} },
    { name: 'Descripci_x00f3_n', displayName: 'Descripción', text: { allowMultipleLines: true } },
    eleccion('Estado', 'Estado', ['Pendiente', 'En curso', 'Resuelto']),
    { name: 'Asignadoa', displayName: 'Asignado a', personOrGroup: {} },
    { name: 'Seguimiento', displayName: 'Seguimiento', text: { allowMultipleLines: true } },
    { name: 'Fechaderesoluci_x00f3_n', displayName: 'Fecha de resolución', dateTime: {} },
  ];
}

describe('construirMapa', () => {
  it('relaciona nombres visibles con los internos codificados', () => {
    const mapa = construirMapa(columnasValidas());
    expect(mapa.interno.area).toBe('_x00c1_rea');
    expect(mapa.interno.titulo).toBe('Title');
    expect(mapa.interno.habitacion).toBe('Habitaci_x00f3_n');
    expect(mapa.interno.asignado).toBe('Asignadoa');
    expect(mapa.interno.fechaResolucion).toBe('Fechaderesoluci_x00f3_n');
  });

  it('lee las opciones de los desplegables de la lista', () => {
    const mapa = construirMapa(columnasValidas());
    expect(mapa.opciones.area).toEqual(['Mayordomía', 'Recepción', 'Botones', 'General']);
    expect(mapa.opciones.estado).toEqual(['Pendiente', 'En curso', 'Resuelto']);
  });

  it('no distingue mayúsculas ni tildes en el nombre visible', () => {
    const cols = columnasValidas().map((c) =>
      c.displayName === 'Área' ? { ...c, displayName: 'area' } : c,
    );
    expect(construirMapa(cols).interno.area).toBe('_x00c1_rea');
  });

  it('ignora columnas de solo lectura con el mismo nombre visible', () => {
    const cols: ColumnaGraph[] = [
      { name: 'Seguimiento_calc', displayName: 'Seguimiento', readOnly: true, text: {} },
      ...columnasValidas(),
    ];
    expect(construirMapa(cols).interno.seguimiento).toBe('Seguimiento');
  });

  it('informa de columnas que faltan', () => {
    const cols = columnasValidas().filter(
      (c) => c.displayName !== 'Seguimiento' && c.displayName !== 'Fecha de resolución',
    );
    try {
      construirMapa(cols);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorColumnas);
      const problemas = (e as ErrorColumnas).problemas;
      expect(problemas).toContain('Falta la columna "Seguimiento".');
      expect(problemas).toContain('Falta la columna "Fecha de resolución".');
    }
  });

  it('exige los estados y prioridades con los que trabaja la app', () => {
    const cols = columnasValidas().map((c) =>
      c.name === 'Estado' ? eleccion('Estado', 'Estado', ['Pendiente', 'Cerrado']) : c,
    );
    expect(() => construirMapa(cols)).toThrow(/En curso, Resuelto/);
  });

  it('rechaza una columna con el tipo equivocado', () => {
    const cols = columnasValidas().map((c) =>
      c.name === 'Asignadoa' ? { name: 'Asignadoa', displayName: 'Asignado a', text: {} } : c,
    );
    expect(() => construirMapa(cols)).toThrow(/Asignado a/);
  });
});
