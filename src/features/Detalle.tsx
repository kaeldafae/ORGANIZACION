import { useEffect, useState, type SyntheticEvent } from 'react';
import type { Foto, Incidencia } from '../domain/tipos';
import { LIMITES } from '../domain/valores';
import { parsearSeguimiento } from '../domain/seguimiento';
import { fechaHora, tiempoRelativo } from '../domain/tiempo';
import { puede } from '../domain/permisos';
import { slug } from '../domain/texto';
import { useIncidencias } from '../state/incidencias';
import { useSesion } from '../state/sesion';
import { useAvisos } from '../state/avisos';
import { AppError, mensajeDe } from '../data/errores';
import { nombreFoto, prepararFoto } from '../data/fotos';
import { Enlace } from '../router/router';
import { EtiquetaEstado, EtiquetaPrioridad } from '../ui/Etiquetas';
import { BloqueError, Cargando, Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

export function Detalle({ id }: { id: string }) {
  const { items, repo, guardarLocal } = useIncidencias();
  const enCache = items.find((i) => i.id === id) ?? null;
  const [fresca, setFresca] = useState<Incidencia | null>(null);
  // La caché se actualiza con la versión del servidor y con los cambios optimistas.
  const inc = enCache ?? fresca;
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Siempre se relee del servidor: el seguimiento puede haber cambiado.
  useEffect(() => {
    let vivo = true;
    repo
      .obtener(id)
      .then((i) => {
        if (!vivo) return;
        setFresca(i);
        guardarLocal(i);
        setError(null);
      })
      .catch((e: unknown) => {
        if (vivo) setError(mensajeDe(e));
      });
    return () => {
      vivo = false;
    };
  }, [id, repo, guardarLocal, intento]);

  if (!inc) {
    return (
      <div className="pagina">
        {error ? (
          <BloqueError mensaje={error} reintentar={() => setIntento((n) => n + 1)} />
        ) : (
          <Cargando />
        )}
      </div>
    );
  }
  return <Ficha inc={inc} />;
}

function Ficha({ inc }: { inc: Incidencia }) {
  const { opciones, personas, moverEstado, reasignar, anadirNota, ahora } = useIncidencias();
  const { usuario, config } = useSesion();
  const { avisar } = useAvisos();
  const [nota, setNota] = useState('');
  const [errorNota, setErrorNota] = useState<string | null>(null);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const notas = parsearSeguimiento(inc.seguimiento);
  const puedeReasignar = puede(usuario.rol, 'reasignar');

  const enviarNota = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const texto = nota.trim();
    if (!texto) {
      setErrorNota('Escribe la nota antes de añadirla.');
      return;
    }
    setGuardandoNota(true);
    setErrorNota(null);
    try {
      await anadirNota(inc.id, texto, usuario.nombre);
      setNota('');
      avisar('Nota añadida.', 'exito');
    } catch (err) {
      setErrorNota(
        err instanceof AppError
          ? err.message
          : err instanceof Error && err.name === 'SeguimientoLlenoError'
            ? 'El seguimiento está lleno. Crea una incidencia nueva que continúe esta.'
            : mensajeDe(err),
      );
    } finally {
      setGuardandoNota(false);
    }
  };

  return (
    <div className="pagina pagina--estrecha">
      <nav aria-label="Ruta" className="migas">
        <Enlace a={`/area/${slug(inc.area)}`}>{inc.area}</Enlace>
        <span aria-hidden="true"> / </span>
        <span>Incidencia</span>
      </nav>
      <h1 className="pagina__titulo">{inc.titulo}</h1>
      <div className="detalle__etiquetas">
        <EtiquetaPrioridad prioridad={inc.prioridad} />
        <EtiquetaEstado estado={inc.estado} />
      </div>

      <section className="tarjeta" aria-labelledby="h-estado">
        <h2 id="h-estado" className="tarjeta__titulo">
          Estado y responsable
        </h2>
        {puede(usuario.rol, 'moverEstado') && opciones && (
          <div className="chips" role="group" aria-label="Cambiar estado">
            {opciones.estado.map((e) => (
              <button
                key={e}
                type="button"
                className="chip"
                aria-pressed={inc.estado === e}
                onClick={() => {
                  if (inc.estado !== e) void moverEstado(inc.id, e).catch(() => undefined);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="campo">
          <label htmlFor="det-asignado" className="campo__etiqueta">
            Asignado a
          </label>
          {puedeReasignar ? (
            <select
              id="det-asignado"
              value={inc.asignado?.id ?? ''}
              onChange={(e) =>
                void reasignar(inc.id, e.target.value || null).catch(() => undefined)
              }
            >
              <option value="">Sin asignar</option>
              {inc.asignado && !personas.some((p) => p.id === inc.asignado?.id) && (
                <option value={inc.asignado.id}>{inc.asignado.nombre}</option>
              )}
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          ) : (
            <>
              <output id="det-asignado" className="valor">
                {inc.asignado?.nombre ?? 'Sin asignar'}
              </output>
              <p className="ayuda">Solo los managers pueden reasignar.</p>
            </>
          )}
        </div>
      </section>

      <section className="tarjeta" aria-labelledby="h-datos">
        <h2 id="h-datos" className="tarjeta__titulo">
          Datos
        </h2>
        <dl className="datos">
          <Dato nombre="Área" valor={inc.area} />
          <Dato nombre="Tipo" valor={inc.tipo} />
          <Dato nombre="Turno" valor={inc.turno} />
          <Dato nombre="Habitación" valor={inc.habitacion || '—'} />
          <Dato
            nombre="Creada"
            valor={`${fechaHora(inc.creado, config.zona)} · ${inc.autor || 'Desconocido'}`}
          />
          <Dato
            nombre="Última modificación"
            valor={`${tiempoRelativo(inc.modificado, ahora)} · ${inc.editor || 'Desconocido'}`}
          />
          {inc.fechaResolucion && (
            <Dato nombre="Resuelta" valor={fechaHora(inc.fechaResolucion, config.zona)} />
          )}
        </dl>
        {inc.descripcion && (
          <>
            <h3 className="subtitulo">Descripción</h3>
            <p className="texto-libre">{inc.descripcion}</p>
          </>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="h-seg">
        <h2 id="h-seg" className="tarjeta__titulo">
          Seguimiento
        </h2>
        {notas.length === 0 ? (
          <Vacio>Todavía no hay notas.</Vacio>
        ) : (
          <ol className="seguimiento">
            {notas.map((n, i) => (
              <li key={`${n.fecha}-${String(i)}`} className="nota">
                <p className="nota__meta">
                  <strong>{n.autor}</strong>
                  {n.fecha && <time dateTime={n.fecha}> · {fechaHora(n.fecha, config.zona)}</time>}
                </p>
                <p className="texto-libre">{n.texto}</p>
              </li>
            ))}
          </ol>
        )}
        {puede(usuario.rol, 'comentar') && (
          <form className="formulario" noValidate onSubmit={(e) => void enviarNota(e)}>
            <div className={`campo${errorNota ? ' campo--error' : ''}`}>
              <label htmlFor="nota" className="campo__etiqueta">
                Añadir nota
              </label>
              <textarea
                id="nota"
                rows={3}
                maxLength={LIMITES.nota}
                value={nota}
                aria-invalid={Boolean(errorNota)}
                aria-describedby={`ayuda-nota${errorNota ? ' err-nota' : ''}`}
                onChange={(e) => setNota(e.target.value)}
              />
              <p id="ayuda-nota" className="ayuda">
                Queda con tu nombre, fecha y hora. Las notas no se pueden editar. Sin datos de
                huéspedes.
              </p>
              {errorNota && (
                <p id="err-nota" className="campo__error">
                  {errorNota}
                </p>
              )}
            </div>
            <button type="submit" className="boton boton--primario" disabled={guardandoNota}>
              {guardandoNota ? 'Guardando…' : 'Añadir nota'}
            </button>
          </form>
        )}
      </section>

      <Fotos id={inc.id} />
    </div>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="dato">
      <dt>{nombre}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Fotos({ id }: { id: string }) {
  const { repo } = useIncidencias();
  const { config } = useSesion();
  const { avisar } = useAvisos();
  const [fotos, setFotos] = useState<{ foto: Foto; url: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const control = { vivo: true };
    const urls: string[] = [];
    (async () => {
      const lista = await repo.fotos(id);
      const cargadas = await Promise.all(
        lista.map(async (foto) => {
          const url = URL.createObjectURL(await repo.descargarFoto(foto));
          urls.push(url);
          return { foto, url };
        }),
      );
      if (control.vivo) {
        setFotos(cargadas);
        setError(null);
      }
    })().catch((e: unknown) => {
      if (control.vivo) setError(mensajeDe(e));
    });
    return () => {
      control.vivo = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id, repo, version]);

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    try {
      const blob = await prepararFoto(archivo, config.maxFotoBytes);
      await repo.subirFoto(id, blob, nombreFoto(new Date()));
      avisar('Foto adjuntada.', 'exito');
      setVersion((v) => v + 1);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <section className="tarjeta" aria-labelledby="h-fotos">
      <h2 id="h-fotos" className="tarjeta__titulo">
        Fotos
      </h2>
      {error && <BloqueError mensaje={error} reintentar={() => setVersion((v) => v + 1)} />}
      {!error && fotos === null && <Cargando texto="Cargando fotos…" />}
      {fotos?.length === 0 && <Vacio>Sin fotos.</Vacio>}
      {fotos && fotos.length > 0 && (
        <ul className="galeria">
          {fotos.map((f) => (
            <li key={f.foto.ruta}>
              <img src={f.url} alt={`Foto adjunta ${f.foto.nombre}`} loading="lazy" />
            </li>
          ))}
        </ul>
      )}
      <label className="boton boton--secundario boton-archivo">
        <Icono nombre="camara" tamano={18} />
        {subiendo ? 'Subiendo…' : 'Adjuntar foto'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={subiendo}
          onChange={(e) => {
            void subir(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </section>
  );
}
