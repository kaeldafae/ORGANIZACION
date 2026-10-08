import { describe, expect, it } from 'vitest';
import {
  FRANJAS_POR_DEFECTO,
  parsearFranjas,
  turnoActual,
  turnoParaHora,
} from '../src/domain/turnos';
import { diaEnZona, esHoy, horaEnZona } from '../src/domain/tiempo';

describe('turnos', () => {
  it.each([
    [7, 'Mañana'],
    [14, 'Mañana'],
    [15, 'Tarde'],
    [22, 'Tarde'],
    [23, 'Noche'],
    [0, 'Noche'],
    [6, 'Noche'],
  ])('a las %i h es turno de %s', (hora, turno) => {
    expect(turnoParaHora(hora, FRANJAS_POR_DEFECTO)).toBe(turno);
  });

  it('acepta franjas configuradas', () => {
    const f = parsearFranjas('Mañana=6-14, Tarde=14-22, Noche=22-6');
    expect(turnoParaHora(6, f)).toBe('Mañana');
    expect(turnoParaHora(21, f)).toBe('Tarde');
    expect(turnoParaHora(3, f)).toBe('Noche');
  });

  it('vuelve a las franjas por defecto si la configuración deja horas sin cubrir', () => {
    expect(parsearFranjas('Mañana=7-15,Tarde=15-20')).toBe(FRANJAS_POR_DEFECTO);
  });

  it('vuelve a las franjas por defecto si el texto no es válido', () => {
    expect(parsearFranjas('mañana de 7 a 15')).toBe(FRANJAS_POR_DEFECTO);
    expect(parsearFranjas('X=30-2')).toBe(FRANJAS_POR_DEFECTO);
    expect(parsearFranjas('')).toBe(FRANJAS_POR_DEFECTO);
  });

  it('usa la hora de Madrid, no la del navegador ni UTC', () => {
    // 22:30 UTC del 8 de octubre = 00:30 del 9 en Madrid (horario de verano, UTC+2)
    const t = new Date('2026-10-08T22:30:00Z');
    expect(horaEnZona(t, 'Europe/Madrid')).toBe(0);
    expect(diaEnZona(t, 'Europe/Madrid')).toBe('2026-10-09');
    expect(turnoActual(t, 'Europe/Madrid', FRANJAS_POR_DEFECTO)).toBe('Noche');
    // 14:30 UTC del 8 de enero = 15:30 en Madrid (UTC+1)
    expect(
      turnoActual(new Date('2026-01-08T14:30:00Z'), 'Europe/Madrid', FRANJAS_POR_DEFECTO),
    ).toBe('Tarde');
  });

  it('"hoy" se calcula con el día natural de Madrid', () => {
    const ahora = new Date('2026-10-09T06:00:00Z'); // 08:00 en Madrid
    expect(esHoy('2026-10-08T22:30:00Z', ahora, 'Europe/Madrid')).toBe(true);
    expect(esHoy('2026-10-08T21:30:00Z', ahora, 'Europe/Madrid')).toBe(false);
  });
});
