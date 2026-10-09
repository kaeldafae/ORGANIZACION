import { describe, expect, it } from 'vitest';
import { construirMapa, type ColumnaGraph } from '../src/data/columnas';
import { cambioACampos, itemAIncidencia, nuevaACampos, odata } from '../src/data/mapeo';

const cols: ColumnaGraph[] = [
  { name: 'Title', displayName: 'Título', text: {} },
  { name: '_x00c1_rea', displayName: 'Área', choice: { choices: ['Recepción'] } },
  { name: 'Tipo', displayName: 'Tipo', choice: { choices: ['Incidencia'] } },
  {
    name: 'Prioridad',
    displayName: 'Prioridad',
    choice: { choices: ['Urgente', 'Normal', 'Baja'] },
  },
  { name: 'Turno', displayName: 'Turno', choice: { choices: ['Mañana'] } },
  { name: 'Hab', displayName: 'Habitación', text: {} },
  { name: 'Desc', displayName: 'Descripción', text: {} },
  {
    name: 'Estado',
    displayName: 'Estado',
    choice: { choices: ['Pendiente', 'En curso', 'Resuelto'] },
  },
  { name: 'Asig', displayName: 'Asignado a', personOrGroup: {} },
  { name: 'Seg', displayName: 'Seguimiento', text: {} },
  { name: 'FRes', displayName: 'Fecha de resolución', dateTime: {} },
];
const mapa = construirMapa(cols);

describe('mapeo Graph ↔ incidencia', () => {
  it('convierte un elemento de lista en incidencia', () => {
    const personas = new Map([['7', { id: '7', nombre: 'Ana', email: 'ana@x.es' }]]);
    const inc = itemAIncidencia(
      {
        id: '12',
        eTag: '"abc,3"',
        createdDateTime: '2026-10-08T08:00:00Z',
        lastModifiedDateTime: '2026-10-08T09:00:00Z',
        createdBy: { user: { displayName: 'Luis' } },
        fields: {
          Title: 'Llave no abre',
          _x00c1_rea: 'Recepción',
          Prioridad: 'Urgente',
          Estado: 'En curso',
          AsigLookupId: '7',
          Hab: '301',
        },
      },
      mapa,
      personas,
    );
    expect(inc).toMatchObject({
      id: '12',
      etag: '"abc,3"',
      titulo: 'Llave no abre',
      area: 'Recepción',
      estado: 'En curso',
      habitacion: '301',
      autor: 'Luis',
      asignado: { id: '7', nombre: 'Ana' },
      fechaResolucion: null,
    });
  });

  it('marca la persona como no encontrada si no está en el sitio', () => {
    const inc = itemAIncidencia({ id: '1', fields: { AsigLookupId: '99' } }, mapa, new Map());
    expect(inc.asignado).toEqual({ id: '99', nombre: 'Persona no encontrada', email: '' });
    expect(inc.estado).toBe('Pendiente');
  });

  it('genera los campos de alta con el estado inicial y sin vacíos', () => {
    const campos = nuevaACampos(
      {
        titulo: 'T',
        area: 'Recepción',
        tipo: 'Incidencia',
        prioridad: 'Normal',
        turno: 'Mañana',
        habitacion: '',
        descripcion: '',
        asignadoId: '7',
      },
      mapa,
    );
    expect(campos).toEqual({
      Title: 'T',
      _x00c1_rea: 'Recepción',
      Tipo: 'Incidencia',
      Prioridad: 'Normal',
      Turno: 'Mañana',
      Estado: 'Pendiente',
      AsigLookupId: '7',
    });
  });

  it('fija la fecha de resolución al resolver y la borra al reabrir', () => {
    const ahora = new Date('2026-10-08T10:00:00Z');
    expect(cambioACampos({ estado: 'Resuelto' }, mapa, ahora)).toEqual({
      Estado: 'Resuelto',
      FRes: '2026-10-08T10:00:00.000Z',
    });
    expect(cambioACampos({ estado: 'Pendiente' }, mapa, ahora)).toEqual({
      Estado: 'Pendiente',
      FRes: null,
    });
    expect(cambioACampos({ asignadoId: null }, mapa, ahora)).toEqual({ AsigLookupId: null });
  });

  it('escapa comillas en literales OData', () => {
    expect(odata("O'Brien")).toBe("'O''Brien'");
  });
});
