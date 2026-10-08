import { MS_DIA } from './valores';

function partes(fecha: Date, zona: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(fecha)) out[p.type] = p.value;
  return out;
}

/** Hora (0-23) en la zona horaria indicada. */
export function horaEnZona(fecha: Date, zona: string): number {
  return Number(partes(fecha, zona).hour);
}

/** Día natural ("2026-10-08") en la zona horaria indicada. */
export function diaEnZona(fecha: Date, zona: string): string {
  const p = partes(fecha, zona);
  return `${p.year ?? ''}-${p.month ?? ''}-${p.day ?? ''}`;
}

export function esHoy(iso: string, ahora: Date, zona: string): boolean {
  return diaEnZona(new Date(iso), zona) === diaEnZona(ahora, zona);
}

export function haceMenosDe(iso: string, ms: number, ahora: Date): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && ahora.getTime() - t <= ms;
}

export function haceMasDeDias(iso: string, dias: number, ahora: Date): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && ahora.getTime() - t > dias * MS_DIA;
}

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer"... */
export function tiempoRelativo(iso: string, ahora: Date): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const seg = Math.round((t - ahora.getTime()) / 1000);
  const abs = Math.abs(seg);
  if (abs < 45) return 'ahora mismo';
  if (abs < 3600) return relativo.format(Math.round(seg / 60), 'minute');
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), 'hour');
  if (abs < 86400 * 30) return relativo.format(Math.round(seg / 86400), 'day');
  return relativo.format(Math.round(seg / (86400 * 30)), 'month');
}

export function fechaHora(iso: string, zona: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}
