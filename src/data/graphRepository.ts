import type {
  CambioIncidencia,
  Foto,
  Incidencia,
  NuevaIncidencia,
  OpcionesLista,
  Pagina,
  Persona,
} from '../domain/tipos';
import { ESTADO } from '../domain/valores';
import { anadirNota } from '../domain/seguimiento';
import type { ConfigM365 } from '../config';
import { AppError } from './errores';
import type { Cliente } from './http';
import type { IncidenciasRepository } from './repositorio';
import { construirMapa, type ColumnaGraph, type MapaColumnas } from './columnas';
import {
  cambioACampos,
  camposSelect,
  itemAIncidencia,
  nuevaACampos,
  odata,
  type ItemGraph,
} from './mapeo';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const TAM_PAGINA = 200;
const TAM_HISTORIAL = 25;
const MAX_PAGINAS = 25;
const REINTENTOS_NOTA = 3;

interface Coleccion<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

interface Contexto {
  base: string; // .../sites/{site}/lists/{list}
  siteId: string;
  mapa: MapaColumnas;
}

export class GraphRepository implements IncidenciasRepository {
  private contexto: Promise<Contexto> | null = null;
  private cachePersonas: Promise<Map<string, Persona>> | null = null;
  private readonly cfg: ConfigM365;
  private readonly cliente: Cliente;
  private readonly ahora: () => Date;

  constructor(cfg: ConfigM365, cliente: Cliente, ahora: () => Date = () => new Date()) {
    this.cfg = cfg;
    this.cliente = cliente;
    this.ahora = ahora;
  }

  private get scopesGraph(): string[] {
    return [this.cfg.graphSitesScope];
  }

  private graph<T>(url: string, init: Omit<Parameters<Cliente['peticion']>[1], 'scopes'> = {}) {
    return this.cliente.peticion<T>(url, { ...init, scopes: this.scopesGraph });
  }

  private ctx(): Promise<Contexto> {
    this.contexto ??= this.cargarContexto().catch((e: unknown) => {
      this.contexto = null; // permitir reintentar
      throw e;
    });
    return this.contexto;
  }

  private async cargarContexto(): Promise<Contexto> {
    const ruta = this.cfg.sitePath
      ? `${this.cfg.siteHost}:${this.cfg.sitePath}`
      : this.cfg.siteHost;
    const site = await this.graph<{ id: string }>(`${GRAPH}/sites/${ruta}?$select=id`);
    const listas = await this.graph<Coleccion<{ id: string }>>(
      `${GRAPH}/sites/${site.id}/lists?$select=id,displayName&$filter=displayName eq ${encodeURIComponent(odata(this.cfg.listName))}`,
    );
    const lista = listas.value[0];
    if (!lista) {
      throw new AppError(
        'configuracion',
        `No se encuentra la lista "${this.cfg.listName}" en el sitio. Avisa a IT.`,
      );
    }
    const base = `${GRAPH}/sites/${site.id}/lists/${lista.id}`;
    const columnas = await this.graph<Coleccion<ColumnaGraph>>(`${base}/columns`);
    return { base, siteId: site.id, mapa: construirMapa(columnas.value) };
  }

  /** Recorre @odata.nextLink. Solo sigue enlaces de Graph (no se envía el token a otro dominio). */
  private async todas<T>(url: string): Promise<T[]> {
    const out: T[] = [];
    let siguiente: string | undefined = url;
    for (let i = 0; siguiente && i < MAX_PAGINAS; i++) {
      const pagina: Coleccion<T> = await this.graph<Coleccion<T>>(seguro(siguiente));
      out.push(...pagina.value);
      siguiente = pagina['@odata.nextLink'];
    }
    return out;
  }

  private async mapear(items: ItemGraph[]): Promise<Incidencia[]> {
    const { mapa } = await this.ctx();
    const personas = await this.mapaPersonas();
    return items.map((i) => itemAIncidencia(i, mapa, personas));
  }

  private async consulta(filtro: string, extra = ''): Promise<string> {
    const { base, mapa } = await this.ctx();
    return (
      `${base}/items?$expand=fields($select=${camposSelect(mapa)})` +
      `&$filter=${encodeURIComponent(filtro)}${extra}`
    );
  }

  async opciones(): Promise<OpcionesLista> {
    return (await this.ctx()).mapa.opciones;
  }

  private mapaPersonas(): Promise<Map<string, Persona>> {
    this.cachePersonas ??= this.cargarPersonas().catch((e: unknown) => {
      this.cachePersonas = null;
      throw e;
    });
    return this.cachePersonas;
  }

  /**
   * Las columnas de persona guardan el id de usuario DEL SITIO, no el de Entra.
   * Ese id está en la lista oculta "User Information List" del propio sitio.
   */
  private async cargarPersonas(): Promise<Map<string, Persona>> {
    const { siteId } = await this.ctx();
    const items = await this.todas<ItemGraph>(
      `${GRAPH}/sites/${siteId}/lists/${encodeURIComponent('User Information List')}/items` +
        `?$expand=fields($select=Title,EMail,Deleted)&$top=${TAM_PAGINA}`,
    );
    const mapa = new Map<string, Persona>();
    for (const it of items) {
      const f = it.fields ?? {};
      const email = typeof f.EMail === 'string' ? f.EMail : '';
      const nombre = typeof f.Title === 'string' ? f.Title : '';
      if (!email || !nombre || f.Deleted === true) continue;
      mapa.set(it.id, { id: it.id, nombre, email });
    }
    return mapa;
  }

  async personas(): Promise<Persona[]> {
    const mapa = await this.mapaPersonas();
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async abiertas(): Promise<Incidencia[]> {
    const { mapa } = await this.ctx();
    const url = await this.consulta(
      `fields/${mapa.interno.estado} ne ${odata(ESTADO.resuelto)}`,
      `&$top=${TAM_PAGINA}`,
    );
    return this.mapear(await this.todas<ItemGraph>(url));
  }

  async resueltasDesde(desde: string): Promise<Incidencia[]> {
    const { mapa } = await this.ctx();
    const c = mapa.interno;
    const url = await this.consulta(
      `fields/${c.estado} eq ${odata(ESTADO.resuelto)} and fields/${c.fechaResolucion} ge ${odata(desde)}`,
      `&$top=${TAM_PAGINA}`,
    );
    return this.mapear(await this.todas<ItemGraph>(url));
  }

  async historial(cursor: string | null): Promise<Pagina<Incidencia>> {
    const { mapa } = await this.ctx();
    const url =
      cursor !== null
        ? seguro(cursor)
        : await this.consulta(
            `fields/${mapa.interno.estado} eq ${odata(ESTADO.resuelto)}`,
            `&$orderby=${encodeURIComponent('fields/Modified desc')}&$top=${TAM_HISTORIAL}`,
          );
    const pagina = await this.graph<Coleccion<ItemGraph>>(url);
    return {
      elementos: await this.mapear(pagina.value),
      siguiente: pagina['@odata.nextLink'] ?? null,
    };
  }

  async obtener(id: string): Promise<Incidencia> {
    const { base, mapa } = await this.ctx();
    const item = await this.graph<ItemGraph>(
      `${base}/items/${idNumerico(id)}?$expand=fields($select=${camposSelect(mapa)})`,
    );
    const [inc] = await this.mapear([item]);
    if (!inc) throw new AppError('no-encontrado');
    return inc;
  }

  async crear(datos: NuevaIncidencia): Promise<Incidencia> {
    const { base, mapa } = await this.ctx();
    const creado = await this.graph<ItemGraph>(`${base}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: nuevaACampos(datos, mapa) }),
    });
    return this.obtener(creado.id);
  }

  async actualizar(id: string, cambio: CambioIncidencia): Promise<Incidencia> {
    const { base, mapa } = await this.ctx();
    await this.graph(`${base}/items/${idNumerico(id)}/fields`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambioACampos(cambio, mapa, this.ahora())),
    });
    return this.obtener(id);
  }

  /**
   * Añade una nota al final del seguimiento. Usa la versión del elemento (If-Match)
   * para no pisar una nota que otra persona haya guardado a la vez; si ocurre,
   * relee y vuelve a intentarlo.
   */
  async anadirNota(id: string, texto: string, autor: string): Promise<Incidencia> {
    const { base, mapa } = await this.ctx();
    for (let intento = 0; ; intento++) {
      const actual = await this.obtener(id);
      const nuevo = anadirNota(actual.seguimiento, texto, autor, this.ahora());
      try {
        await this.graph(`${base}/items/${idNumerico(id)}/fields`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(actual.etag ? { 'If-Match': actual.etag } : {}),
          },
          body: JSON.stringify({ [mapa.interno.seguimiento]: nuevo }),
        });
        return await this.obtener(id);
      } catch (e) {
        if (e instanceof AppError && e.tipo === 'conflicto' && intento < REINTENTOS_NOTA) continue;
        throw e;
      }
    }
  }

  // ---- Fotos: API REST de SharePoint (Graph no gestiona adjuntos de elementos de lista) ----

  private get scopesSharePoint(): string[] {
    return [this.cfg.sharePointScope];
  }

  private urlAdjuntos(id: string): string {
    const titulo = encodeURIComponent(this.cfg.listName.replace(/'/g, "''"));
    return `${this.cfg.siteUrl}/_api/web/lists/getbytitle('${titulo}')/items(${idNumerico(id)})/AttachmentFiles`;
  }

  async fotos(id: string): Promise<Foto[]> {
    const res = await this.cliente.peticion<{
      value: { FileName: string; ServerRelativeUrl: string }[];
    }>(this.urlAdjuntos(id), {
      scopes: this.scopesSharePoint,
      headers: { Accept: 'application/json;odata=nometadata' },
    });
    return res.value
      .filter((a) => /\.(jpe?g|png|webp|gif)$/i.test(a.FileName))
      .map((a) => ({ nombre: a.FileName, ruta: a.ServerRelativeUrl }));
  }

  async subirFoto(id: string, archivo: Blob, nombre: string): Promise<void> {
    const seguroNombre = nombre.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
    await this.cliente.peticion(
      `${this.urlAdjuntos(id)}/add(FileName='${encodeURIComponent(seguroNombre)}')`,
      {
        method: 'POST',
        scopes: this.scopesSharePoint,
        headers: { Accept: 'application/json;odata=nometadata' },
        body: archivo,
        respuesta: 'nada',
      },
    );
  }

  async descargarFoto(foto: Foto): Promise<Blob> {
    if (!foto.ruta.startsWith(`${this.cfg.sitePath}/`)) throw new AppError('no-encontrado');
    const ruta = encodeURIComponent(foto.ruta.replace(/'/g, "''"));
    return this.cliente.peticion<Blob>(
      `${this.cfg.siteUrl}/_api/web/GetFileByServerRelativePath(decodedurl='${ruta}')/$value`,
      { scopes: this.scopesSharePoint, respuesta: 'blob' },
    );
  }
}

function idNumerico(id: string): string {
  if (!/^\d+$/.test(id)) throw new AppError('no-encontrado');
  return id;
}

function seguro(url: string): string {
  if (!url.startsWith(`${GRAPH}/`)) throw new AppError('desconocido');
  return url;
}
