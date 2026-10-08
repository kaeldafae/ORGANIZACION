import type { Incidencia, Persona } from '../domain/tipos';
import { ESTADO, MS_DIA, MS_HORA, PRIORIDAD, TIPO_REUNION } from '../domain/valores';

/** Personal ficticio (sin datos reales). */
export const PERSONAS_DEMO: readonly Persona[] = [
  { id: '1', nombre: 'Lucía Martín', email: 'lucia.martin@hotel.example' },
  { id: '2', nombre: 'Javier Ortega', email: 'javier.ortega@hotel.example' },
  { id: '3', nombre: 'Marta Vidal', email: 'marta.vidal@hotel.example' },
  { id: '4', nombre: 'Andrés Pons', email: 'andres.pons@hotel.example' },
  { id: '5', nombre: 'Elena Ferrer', email: 'elena.ferrer@hotel.example' },
  { id: '6', nombre: 'Tomás Riera', email: 'tomas.riera@hotel.example' },
];

type Semilla = [
  titulo: string,
  area: string,
  tipo: string,
  prioridad: string,
  estado: string,
  habitacion: string,
  horasAtras: number,
  asignado: string | null,
  descripcion?: string,
];

const S: readonly Semilla[] = [
  [
    'Aire acondicionado no enfría',
    'Mayordomía',
    'Incidencia',
    PRIORIDAD.urgente,
    ESTADO.pendiente,
    '214',
    0.5,
    '1',
    'Llamada desde la habitación. Mantenimiento avisado por teléfono.',
  ],
  [
    'Almohadas extra',
    'Mayordomía',
    'Petición de huésped',
    PRIORIDAD.normal,
    ESTADO.enCurso,
    '305',
    1.2,
    '3',
  ],
  [
    'Cuna para bebé antes de las 18:00',
    'Mayordomía',
    'Petición de huésped',
    PRIORIDAD.urgente,
    ESTADO.pendiente,
    'Suite 3',
    2,
    null,
  ],
  [
    'Minibar sin reponer',
    'Mayordomía',
    'Error interno',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '118',
    3.5,
    '1',
  ],
  [
    'Revisar stock de amenities planta 4',
    'Mayordomía',
    'Nota para reunión',
    PRIORIDAD.baja,
    ESTADO.pendiente,
    '',
    20,
    null,
    'Se agotan antes del fin de semana. Proponer pedido semanal.',
  ],
  [
    'Mancha en moqueta del pasillo 2',
    'Mayordomía',
    'Incidencia',
    PRIORIDAD.baja,
    ESTADO.enCurso,
    'Pasillo 2',
    30,
    '3',
  ],
  [
    'Plancha no funciona',
    'Mayordomía',
    'Incidencia',
    PRIORIDAD.normal,
    ESTADO.resuelto,
    '207',
    10,
    '1',
  ],
  [
    'Late check-out confirmado 14:00',
    'Recepción',
    'Traspaso de turno',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '410',
    0.2,
    '2',
    'Ver ficha en PMS. Avisar a Mayordomía para no entrar antes.',
  ],
  [
    'Error de tarifa en reserva de grupo',
    'Recepción',
    'Error interno',
    PRIORIDAD.urgente,
    ESTADO.enCurso,
    '',
    4,
    '2',
    'Revisar en PMS antes de facturar. Ver ficha en PMS.',
  ],
  [
    'Taxi al aeropuerto a las 6:00',
    'Recepción',
    'Petición de huésped',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '122',
    6,
    '4',
  ],
  [
    'Factura con NIF de empresa',
    'Recepción',
    'Petición de huésped',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '233',
    8,
    null,
    'Datos de facturación en PMS.',
  ],
  [
    'Llave de la 301 no abre',
    'Recepción',
    'Incidencia',
    PRIORIDAD.urgente,
    ESTADO.pendiente,
    '301',
    0.8,
    null,
  ],
  [
    'Propuesta: check-in exprés para grupos',
    'Recepción',
    TIPO_REUNION,
    PRIORIDAD.baja,
    ESTADO.pendiente,
    '',
    50,
    null,
  ],
  [
    'Overbooking previsto el sábado',
    'Recepción',
    TIPO_REUNION,
    PRIORIDAD.normal,
    ESTADO.enCurso,
    '',
    26,
    '5',
  ],
  [
    'Cambio de habitación por ruido',
    'Recepción',
    'Petición de huésped',
    PRIORIDAD.normal,
    ESTADO.resuelto,
    '115',
    14,
    '2',
  ],
  [
    'Caja descuadrada turno de noche',
    'Recepción',
    'Error interno',
    PRIORIDAD.urgente,
    ESTADO.resuelto,
    '',
    20,
    '5',
  ],
  [
    'Subir equipaje a la 512',
    'Botones',
    'Petición de huésped',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '512',
    0.3,
    '6',
  ],
  [
    'Carro portaequipajes con rueda rota',
    'Botones',
    'Incidencia',
    PRIORIDAD.baja,
    ESTADO.pendiente,
    'Lobby',
    9,
    null,
  ],
  ['Consigna llena', 'Botones', 'Incidencia', PRIORIDAD.normal, ESTADO.enCurso, 'Consigna', 5, '4'],
  [
    'Paquete pendiente de entregar',
    'Botones',
    'Traspaso de turno',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '208',
    7,
    '6',
    'Recogido en recepción a las 22:00.',
  ],
  [
    'Turnos de aparcacoches en eventos',
    'Botones',
    TIPO_REUNION,
    PRIORIDAD.baja,
    ESTADO.pendiente,
    '',
    70,
    null,
  ],
  [
    'Bajar maletas del grupo a las 10:00',
    'Botones',
    'Petición de huésped',
    PRIORIDAD.urgente,
    ESTADO.enCurso,
    'Lobby',
    1.5,
    '4',
  ],
  [
    'Paraguas de cortesía agotados',
    'Botones',
    'Incidencia',
    PRIORIDAD.baja,
    ESTADO.resuelto,
    'Lobby',
    22,
    '6',
  ],
  [
    'Wifi lento en zona de desayunos',
    'General',
    'Incidencia',
    PRIORIDAD.normal,
    ESTADO.pendiente,
    'Restaurante',
    11,
    null,
  ],
  [
    'Simulacro de incendio el jueves',
    'General',
    TIPO_REUNION,
    PRIORIDAD.normal,
    ESTADO.pendiente,
    '',
    96,
    '5',
  ],
  [
    'Ascensor 2 hace ruido',
    'General',
    'Incidencia',
    PRIORIDAD.urgente,
    ESTADO.pendiente,
    'Ascensor 2',
    200,
    null,
    'Empresa de mantenimiento avisada. Pendiente de visita.',
  ],
  [
    'Actualizar cartel de horarios del spa',
    'General',
    'Error interno',
    PRIORIDAD.baja,
    ESTADO.pendiente,
    'Spa',
    220,
    '3',
  ],
  [
    'Revisión de extintores',
    'General',
    'Incidencia',
    PRIORIDAD.normal,
    ESTADO.resuelto,
    '',
    120,
    '5',
  ],
  [
    'Luz fundida en escalera B',
    'General',
    'Incidencia',
    PRIORIDAD.baja,
    ESTADO.resuelto,
    'Escalera B',
    300,
    '6',
  ],
  [
    'Traspaso: sala de reuniones reservada mañana',
    'General',
    'Traspaso de turno',
    PRIORIDAD.normal,
    ESTADO.enCurso,
    'Sala Mar',
    3,
    '2',
  ],
];

function turnoDe(fecha: Date): string {
  const h = fecha.getHours();
  if (h >= 7 && h < 15) return 'Mañana';
  if (h >= 15 && h < 23) return 'Tarde';
  return 'Noche';
}

/** Genera las incidencias de ejemplo con fechas relativas a `ahora`. */
export function incidenciasDemo(ahora: Date): Incidencia[] {
  return S.map((s, i) => {
    const [titulo, area, tipo, prioridad, estado, habitacion, horas, asignado, descripcion] = s;
    const creado = new Date(ahora.getTime() - horas * MS_HORA);
    const persona = PERSONAS_DEMO.find((p) => p.id === asignado) ?? null;
    const autor = PERSONAS_DEMO[i % PERSONAS_DEMO.length]?.nombre ?? '';
    const resuelta = estado === ESTADO.resuelto;
    const resolucion = resuelta
      ? new Date(Math.min(creado.getTime() + 2 * MS_HORA, ahora.getTime() - 0.1 * MS_HORA))
      : null;
    const seguimiento =
      estado === ESTADO.enCurso && persona
        ? `[${new Date(creado.getTime() + 0.25 * MS_HORA).toISOString().slice(0, 19)}Z | ${persona.nombre}]\nMe encargo yo.`
        : '';
    return {
      id: String(i + 1),
      etag: '"1"',
      titulo,
      area,
      tipo,
      prioridad,
      turno: turnoDe(creado),
      habitacion,
      descripcion: descripcion ?? '',
      estado,
      asignado: persona,
      seguimiento,
      fechaResolucion: resolucion?.toISOString() ?? null,
      creado: creado.toISOString(),
      modificado: (resolucion ?? creado).toISOString(),
      autor,
      editor: persona?.nombre ?? autor,
    };
  });
}

/** Algunas resueltas antiguas para que el historial tenga varias páginas. */
export function historicoDemo(ahora: Date): Incidencia[] {
  const areas = ['Mayordomía', 'Recepción', 'Botones', 'General'];
  return Array.from({ length: 40 }, (_, i) => {
    const creado = new Date(ahora.getTime() - (3 + i) * MS_DIA);
    const resuelto = new Date(creado.getTime() + 5 * MS_HORA);
    const persona = PERSONAS_DEMO[i % PERSONAS_DEMO.length] ?? null;
    return {
      id: String(100 + i),
      etag: '"1"',
      titulo: `Incidencia archivada n.º ${i + 1}`,
      area: areas[i % areas.length] ?? 'General',
      tipo: 'Incidencia',
      prioridad: i % 5 === 0 ? PRIORIDAD.urgente : PRIORIDAD.normal,
      turno: turnoDe(creado),
      habitacion: String(100 + ((i * 37) % 400)),
      descripcion: '',
      estado: ESTADO.resuelto,
      asignado: persona,
      seguimiento: '',
      fechaResolucion: resuelto.toISOString(),
      creado: creado.toISOString(),
      modificado: resuelto.toISOString(),
      autor: persona?.nombre ?? '',
      editor: persona?.nombre ?? '',
    };
  });
}
