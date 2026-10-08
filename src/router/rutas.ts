export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'area'; slug: string }
  | { nombre: 'detalle'; id: string }
  | { nombre: 'nuevo' }
  | { nombre: 'traspaso' }
  | { nombre: 'reunion' }
  | { nombre: 'direccion' }
  | { nombre: 'historial' }
  | { nombre: 'no-encontrada' };

export function resolverRuta(ruta: string): Ruta {
  const limpia = ruta.replace(/\/+$/, '') || '/';
  if (limpia === '/') return { nombre: 'inicio' };
  const area = /^\/area\/([a-z0-9-]{1,40})$/.exec(limpia);
  if (area?.[1]) return { nombre: 'area', slug: area[1] };
  const detalle = /^\/incidencia\/([A-Za-z0-9-]{1,40})$/.exec(limpia);
  if (detalle?.[1]) return { nombre: 'detalle', id: detalle[1] };
  switch (limpia) {
    case '/nuevo':
      return { nombre: 'nuevo' };
    case '/traspaso':
      return { nombre: 'traspaso' };
    case '/reunion':
      return { nombre: 'reunion' };
    case '/direccion':
      return { nombre: 'direccion' };
    case '/historial':
      return { nombre: 'historial' };
    default:
      return { nombre: 'no-encontrada' };
  }
}
