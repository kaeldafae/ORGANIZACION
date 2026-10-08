import type {
  CambioIncidencia,
  Foto,
  Incidencia,
  NuevaIncidencia,
  OpcionesLista,
  Pagina,
  Persona,
} from '../domain/tipos';
import { ESTADO, OPCIONES_DEMO } from '../domain/valores';
import { anadirNota } from '../domain/seguimiento';
import { AppError } from './errores';
import type { IncidenciasRepository } from './repositorio';
import { PERSONAS_DEMO, historicoDemo, incidenciasDemo } from './demoDatos';

const TAM_HISTORIAL = 25;

export interface OpcionesDemo {
  ahora?: () => Date;
  latenciaMs?: number;
}

/** Repositorio en memoria para el modo demo. Los cambios se pierden al recargar. */
export class DemoRepository implements IncidenciasRepository {
  private datos: Incidencia[];
  private readonly fotosPorId = new Map<string, { foto: Foto; blob: Blob }[]>();
  private siguienteId = 1000;
  private readonly ahora: () => Date;
  private readonly latenciaMs: number;

  constructor(op: OpcionesDemo = {}) {
    this.ahora = op.ahora ?? (() => new Date());
    this.latenciaMs = op.latenciaMs ?? 120;
    const t = this.ahora();
    this.datos = [...incidenciasDemo(t), ...historicoDemo(t)];
  }

  private async pausa(): Promise<void> {
    if (this.latenciaMs > 0) await new Promise((r) => setTimeout(r, this.latenciaMs));
  }

  private copia(i: Incidencia): Incidencia {
    return { ...i, asignado: i.asignado ? { ...i.asignado } : null };
  }

  private buscar(id: string): Incidencia {
    const i = this.datos.find((d) => d.id === id);
    if (!i) throw new AppError('no-encontrado');
    return i;
  }

  private persona(id: string | null): Persona | null {
    if (id === null) return null;
    const p = PERSONAS_DEMO.find((x) => x.id === id);
    if (!p) throw new AppError('validacion', 'Esa persona no existe.');
    return { ...p };
  }

  async opciones(): Promise<OpcionesLista> {
    await this.pausa();
    return OPCIONES_DEMO;
  }

  async personas(): Promise<Persona[]> {
    await this.pausa();
    return PERSONAS_DEMO.map((p) => ({ ...p }));
  }

  async abiertas(): Promise<Incidencia[]> {
    await this.pausa();
    return this.datos.filter((i) => i.estado !== ESTADO.resuelto).map((i) => this.copia(i));
  }

  async resueltasDesde(desde: string): Promise<Incidencia[]> {
    await this.pausa();
    return this.datos
      .filter(
        (i) =>
          i.estado === ESTADO.resuelto && i.fechaResolucion !== null && i.fechaResolucion >= desde,
      )
      .map((i) => this.copia(i));
  }

  async historial(cursor: string | null): Promise<Pagina<Incidencia>> {
    await this.pausa();
    const inicio = cursor === null ? 0 : Number(cursor);
    const todas = this.datos
      .filter((i) => i.estado === ESTADO.resuelto)
      .sort((a, b) => b.modificado.localeCompare(a.modificado));
    const fin = inicio + TAM_HISTORIAL;
    return {
      elementos: todas.slice(inicio, fin).map((i) => this.copia(i)),
      siguiente: fin < todas.length ? String(fin) : null,
    };
  }

  async obtener(id: string): Promise<Incidencia> {
    await this.pausa();
    return this.copia(this.buscar(id));
  }

  async crear(datos: NuevaIncidencia): Promise<Incidencia> {
    await this.pausa();
    const ahora = this.ahora().toISOString();
    const nueva: Incidencia = {
      id: String(this.siguienteId++),
      etag: '"1"',
      titulo: datos.titulo,
      area: datos.area,
      tipo: datos.tipo,
      prioridad: datos.prioridad,
      turno: datos.turno,
      habitacion: datos.habitacion,
      descripcion: datos.descripcion,
      estado: ESTADO.pendiente,
      asignado: this.persona(datos.asignadoId),
      seguimiento: '',
      fechaResolucion: null,
      creado: ahora,
      modificado: ahora,
      autor: 'Tú (demo)',
      editor: 'Tú (demo)',
    };
    this.datos.push(nueva);
    return this.copia(nueva);
  }

  async actualizar(id: string, cambio: CambioIncidencia): Promise<Incidencia> {
    await this.pausa();
    const i = this.buscar(id);
    const ahora = this.ahora().toISOString();
    if (cambio.estado !== undefined) {
      i.estado = cambio.estado;
      i.fechaResolucion = cambio.estado === ESTADO.resuelto ? ahora : null;
    }
    if (cambio.asignadoId !== undefined) i.asignado = this.persona(cambio.asignadoId);
    i.modificado = ahora;
    i.editor = 'Tú (demo)';
    i.etag = `"${String(Number(i.etag?.replace(/"/g, '') ?? '1') + 1)}"`;
    return this.copia(i);
  }

  async anadirNota(id: string, texto: string, autor: string): Promise<Incidencia> {
    await this.pausa();
    const i = this.buscar(id);
    i.seguimiento = anadirNota(i.seguimiento, texto, autor, this.ahora());
    i.modificado = this.ahora().toISOString();
    return this.copia(i);
  }

  async fotos(id: string): Promise<Foto[]> {
    await this.pausa();
    this.buscar(id);
    return (this.fotosPorId.get(id) ?? []).map((f) => f.foto);
  }

  async subirFoto(id: string, archivo: Blob, nombre: string): Promise<void> {
    await this.pausa();
    this.buscar(id);
    const lista = this.fotosPorId.get(id) ?? [];
    lista.push({ foto: { nombre, ruta: `demo/${id}/${nombre}` }, blob: archivo });
    this.fotosPorId.set(id, lista);
  }

  async descargarFoto(foto: Foto): Promise<Blob> {
    await this.pausa();
    for (const lista of this.fotosPorId.values()) {
      const f = lista.find((x) => x.foto.ruta === foto.ruta);
      if (f) return f.blob;
    }
    throw new AppError('no-encontrado');
  }
}
