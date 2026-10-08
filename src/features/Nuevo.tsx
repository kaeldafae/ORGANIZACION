import { useEffect, useMemo, useRef, useState, type SyntheticEvent, type ReactNode } from 'react';
import type { NuevaIncidencia } from '../domain/tipos';
import { LIMITES, PRIORIDAD } from '../domain/valores';
import { turnoActual } from '../domain/turnos';
import { puede } from '../domain/permisos';
import {
  hayErrores,
  limpiarNueva,
  validarNueva,
  type ErroresFormulario,
} from '../domain/validacion';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { useArea } from '../state/area';
import { useAvisos } from '../state/avisos';
import { useRouter } from '../router/router';
import { mensajeDe } from '../data/errores';
import { nombreFoto, prepararFoto } from '../data/fotos';
import { Icono } from '../ui/Iconos';

const ORDEN: (keyof NuevaIncidencia)[] = [
  'titulo',
  'area',
  'tipo',
  'prioridad',
  'turno',
  'habitacion',
  'descripcion',
];

export function Nuevo() {
  const { opciones, personas, crear, repo } = useIncidencias();
  const { usuario, config } = useSesion();
  const { area } = useArea();
  const { avisar } = useAvisos();
  const { navegar } = useRouter();
  const form = useRef<HTMLFormElement>(null);

  const inicial = useMemo<NuevaIncidencia>(
    () => ({
      titulo: '',
      area: area ?? '',
      tipo: '',
      prioridad: opciones?.prioridad.includes(PRIORIDAD.normal) ? PRIORIDAD.normal : '',
      turno: turnoActual(new Date(), config.zona, config.franjas) ?? '',
      habitacion: '',
      descripcion: '',
      asignadoId: null,
    }),
    [area, opciones, config.zona, config.franjas],
  );
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const vistaPrevia = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(
    () => () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia],
  );

  if (!opciones) return null;

  const cambiar = <K extends keyof NuevaIncidencia>(campo: K, valor: NuevaIncidencia[K]) => {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    if (tocados.has(campo)) setErrores(validarNueva(nuevos, opciones));
  };
  const tocar = (campo: keyof NuevaIncidencia) => {
    setTocados((t) => new Set(t).add(campo));
    setErrores(validarNueva(datos, opciones));
  };
  const visible = (campo: keyof NuevaIncidencia) =>
    tocados.has(campo) ? errores[campo] : undefined;

  const elegirFoto = async (archivo: File | undefined) => {
    setErrorFoto(null);
    setFoto(null);
    if (!archivo) return;
    setPreparandoFoto(true);
    try {
      setFoto(await prepararFoto(archivo, config.maxFotoBytes));
    } catch (e) {
      setErrorFoto(mensajeDe(e));
    } finally {
      setPreparandoFoto(false);
    }
  };

  const enviar = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const limpios = limpiarNueva(datos);
    const errs = validarNueva(limpios, opciones);
    setErrores(errs);
    setTocados(new Set(ORDEN));
    if (hayErrores(errs)) {
      const primero = ORDEN.find((c) => errs[c]);
      if (primero) form.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const creada = await crear(limpios);
      if (foto) {
        try {
          await repo.subirFoto(creada.id, foto, nombreFoto(new Date()));
        } catch (err) {
          avisar(`Incidencia guardada, pero la foto no: ${mensajeDe(err)}`, 'error');
          navegar(`/incidencia/${creada.id}`);
          return;
        }
      }
      avisar('Incidencia guardada.', 'exito');
      navegar('/');
    } catch (err) {
      avisar(mensajeDe(err), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const ayuda = (campo: keyof NuevaIncidencia, extra?: string) => {
    const ids = [visible(campo) ? `err-${campo}` : '', extra ?? ''].filter(Boolean).join(' ');
    return ids || undefined;
  };

  return (
    <div className="pagina pagina--estrecha">
      <h1 className="pagina__titulo">Nueva incidencia</h1>
      <form ref={form} className="formulario" noValidate onSubmit={(e) => void enviar(e)}>
        <Campo id="titulo" etiqueta="Título" obligatorio error={visible('titulo')}>
          <input
            id="titulo"
            name="titulo"
            type="text"
            autoComplete="off"
            maxLength={LIMITES.titulo}
            value={datos.titulo}
            aria-invalid={Boolean(visible('titulo'))}
            aria-describedby={ayuda('titulo')}
            aria-required="true"
            onChange={(e) => cambiar('titulo', e.target.value)}
            onBlur={() => tocar('titulo')}
            placeholder="Ej.: Aire acondicionado no enfría"
          />
        </Campo>

        <div className="formulario__fila">
          <Campo id="area" etiqueta="Área" obligatorio error={visible('area')}>
            <Selector
              campo="area"
              valor={datos.area}
              opciones={opciones.area}
              invalido={Boolean(visible('area'))}
              descrito={ayuda('area')}
              cambiar={(v) => cambiar('area', v)}
              tocar={() => tocar('area')}
            />
          </Campo>
          <Campo id="tipo" etiqueta="Tipo" obligatorio error={visible('tipo')}>
            <Selector
              campo="tipo"
              valor={datos.tipo}
              opciones={opciones.tipo}
              invalido={Boolean(visible('tipo'))}
              descrito={ayuda('tipo')}
              cambiar={(v) => cambiar('tipo', v)}
              tocar={() => tocar('tipo')}
            />
          </Campo>
        </div>

        <Grupo
          campo="prioridad"
          etiqueta="Prioridad"
          valor={datos.prioridad}
          opciones={opciones.prioridad}
          error={visible('prioridad')}
          cambiar={(v) => cambiar('prioridad', v)}
        />
        <Grupo
          campo="turno"
          etiqueta="Turno"
          valor={datos.turno}
          opciones={opciones.turno}
          error={visible('turno')}
          cambiar={(v) => cambiar('turno', v)}
        />

        <Campo id="habitacion" etiqueta="Habitación o lugar" error={visible('habitacion')}>
          <input
            id="habitacion"
            name="habitacion"
            type="text"
            autoComplete="off"
            inputMode="text"
            maxLength={LIMITES.habitacion}
            value={datos.habitacion}
            aria-invalid={Boolean(visible('habitacion'))}
            aria-describedby={ayuda('habitacion')}
            onChange={(e) => cambiar('habitacion', e.target.value)}
            onBlur={() => tocar('habitacion')}
            placeholder="214, Suite 3, Lobby…"
          />
        </Campo>

        <Campo id="descripcion" etiqueta="Descripción" error={visible('descripcion')}>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            maxLength={LIMITES.descripcion}
            value={datos.descripcion}
            aria-invalid={Boolean(visible('descripcion'))}
            aria-describedby={ayuda('descripcion', 'aviso-datos')}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            onBlur={() => tocar('descripcion')}
          />
          <p id="aviso-datos" className="aviso-datos">
            No escribas nombres de huéspedes, alergias ni datos médicos. Usa el número de habitación
            y &lsquo;Ver ficha en PMS&rsquo;.
          </p>
        </Campo>

        {puede(usuario.rol, 'asignarAlCrear') && (
          <Campo id="asignado" etiqueta="Asignado a">
            <select
              id="asignado"
              name="asignadoId"
              value={datos.asignadoId ?? ''}
              onChange={(e) => cambiar('asignadoId', e.target.value || null)}
            >
              <option value="">Sin asignar</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div className={`campo${errorFoto ? ' campo--error' : ''}`}>
          <span className="campo__etiqueta" id="etq-foto">
            Foto (opcional)
          </span>
          <label className="boton boton--secundario boton-archivo">
            <Icono nombre="camara" tamano={18} />
            {foto ? 'Cambiar foto' : 'Hacer o elegir foto'}
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-labelledby="etq-foto"
              aria-invalid={Boolean(errorFoto)}
              aria-describedby={errorFoto ? 'err-foto' : undefined}
              onChange={(e) => void elegirFoto(e.target.files?.[0])}
            />
          </label>
          {preparandoFoto && <p className="ayuda">Preparando foto…</p>}
          {vistaPrevia && (
            <img className="vista-previa" src={vistaPrevia} alt="Vista previa de la foto adjunta" />
          )}
          {errorFoto && (
            <p id="err-foto" className="campo__error">
              {errorFoto}
            </p>
          )}
        </div>

        <div className="formulario__acciones">
          <button
            type="submit"
            className="boton boton--primario"
            disabled={enviando || preparandoFoto}
          >
            <Icono nombre="mas" tamano={18} />
            {enviando ? 'Guardando…' : 'Guardar incidencia'}
          </button>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => window.history.back()}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  obligatorio = false,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={`campo${error ? ' campo--error' : ''}`}>
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
        {obligatorio && <span className="obligatorio"> (obligatorio)</span>}
      </label>
      {children}
      {error && (
        <p id={`err-${id}`} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}

function Selector({
  campo,
  valor,
  opciones,
  invalido,
  descrito,
  cambiar,
  tocar,
}: {
  campo: string;
  valor: string;
  opciones: readonly string[];
  invalido: boolean;
  descrito: string | undefined;
  cambiar: (v: string) => void;
  tocar: () => void;
}) {
  return (
    <select
      id={campo}
      name={campo}
      value={valor}
      aria-invalid={invalido}
      aria-describedby={descrito}
      aria-required="true"
      onChange={(e) => cambiar(e.target.value)}
      onBlur={tocar}
    >
      <option value="">Elige…</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** Grupo de opciones como botones de radio: un toque en móvil. */
function Grupo({
  campo,
  etiqueta,
  valor,
  opciones,
  error,
  cambiar,
}: {
  campo: string;
  etiqueta: string;
  valor: string;
  opciones: readonly string[];
  error: string | undefined;
  cambiar: (v: string) => void;
}) {
  return (
    <fieldset
      className={`campo grupo${error ? ' campo--error' : ''}`}
      aria-describedby={error ? `err-${campo}` : undefined}
    >
      <legend className="campo__etiqueta">
        {etiqueta}
        <span className="obligatorio"> (obligatorio)</span>
      </legend>
      <div className="grupo__opciones">
        {opciones.map((o, i) => (
          <label key={o} className="grupo__opcion">
            <input
              type="radio"
              name={campo}
              value={o}
              checked={valor === o}
              onChange={() => cambiar(o)}
              aria-invalid={Boolean(error) && i === 0 ? true : undefined}
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`err-${campo}`} className="campo__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
