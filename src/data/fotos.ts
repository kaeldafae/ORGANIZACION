import { AppError } from './errores';

const LADO_MAXIMO = 1600;
const CALIDADES = [0.82, 0.7, 0.55, 0.4];

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
}

/**
 * Comprueba que el archivo es una imagen, la reduce a un máximo de 1600 px por lado
 * y la recomprime en JPEG hasta quedar por debajo de `maxBytes`.
 * Al redibujar se eliminan también los metadatos (incluida la ubicación GPS).
 */
export async function prepararFoto(archivo: File, maxBytes: number): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) {
    throw new AppError('validacion', 'Solo se pueden adjuntar imágenes.');
  }
  if (archivo.size > maxBytes * 8) {
    throw new AppError('validacion', 'La imagen es demasiado grande.');
  }
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    throw new AppError(
      'validacion',
      'No se puede leer esta imagen. Prueba con una foto en formato JPG o PNG.',
    );
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppError('desconocido');
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  for (const calidad of CALIDADES) {
    const blob = await aBlob(canvas, calidad);
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new AppError(
    'validacion',
    `La foto supera ${String(Math.round(maxBytes / 1048576))} MB incluso comprimida.`,
  );
}

export function nombreFoto(ahora: Date): string {
  const s = ahora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `foto-${s}.jpg`;
}
