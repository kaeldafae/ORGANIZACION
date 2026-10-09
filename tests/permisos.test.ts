import { describe, expect, it } from 'vitest';
import { puede } from '../src/domain/permisos';
import { resolverArea } from '../src/state/area';

describe('permisos de interfaz', () => {
  it('managers ven Dirección y pueden reasignar', () => {
    expect(puede('manager', 'verDireccion')).toBe(true);
    expect(puede('manager', 'reasignar')).toBe(true);
  });

  it('el equipo crea, comenta y mueve estado, pero no reasigna ni ve Dirección', () => {
    expect(puede('equipo', 'crear')).toBe(true);
    expect(puede('equipo', 'comentar')).toBe(true);
    expect(puede('equipo', 'moverEstado')).toBe(true);
    expect(puede('equipo', 'asignarAlCrear')).toBe(true);
    expect(puede('equipo', 'reasignar')).toBe(false);
    expect(puede('equipo', 'verDireccion')).toBe(false);
  });
});

describe('área del usuario', () => {
  const areas = ['Mayordomía', 'Recepción', 'Botones', 'General'];
  it('prioriza la elegida en el navegador', () => {
    expect(resolverArea(areas, 'Recepción', 'Botones')).toBe('Botones');
  });
  it('usa el departamento de Entra ID sin tildes ni mayúsculas', () => {
    expect(resolverArea(areas, 'MAYORDOMIA', null)).toBe('Mayordomía');
    expect(resolverArea(areas, 'Dpto. Recepción', null)).toBe('Recepción');
  });
  it('devuelve null si no hay pista', () => {
    expect(resolverArea(areas, 'Cocina', null)).toBeNull();
    expect(resolverArea(areas, null, 'Spa')).toBeNull();
  });
});
