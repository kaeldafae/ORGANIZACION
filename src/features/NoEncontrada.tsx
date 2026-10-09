import { Enlace } from '../router/router';

export function NoEncontrada() {
  return (
    <div className="pagina">
      <h1 className="pagina__titulo">No encontrado</h1>
      <p>Esta página no existe.</p>
      <Enlace a="/" className="boton">
        Volver al inicio
      </Enlace>
    </div>
  );
}
