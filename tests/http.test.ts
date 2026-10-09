import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearCliente, esperaReintento } from '../src/data/http';
import { AppError } from '../src/data/errores';

const respuesta = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cliente HTTP', () => {
  const token = vi.fn(() => Promise.resolve('tk'));

  it('envía el token y devuelve JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(respuesta(200, { ok: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    const r = await crearCliente(token).peticion<{ ok: number }>('https://x', { scopes: ['s'] });
    expect(r.ok).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://x');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer tk' });
  });

  it('reintenta tras un 429 respetando Retry-After', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuesta(429, {}, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(respuesta(200, { ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const esperar = vi.fn(() => Promise.resolve());
    await crearCliente(token).peticion('https://x', { scopes: ['s'], esperar });
    expect(esperar).toHaveBeenCalledWith(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('se rinde tras varios 429 con un mensaje comprensible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respuesta(429))),
    );
    const p = crearCliente(token).peticion('https://x', {
      scopes: ['s'],
      esperar: () => Promise.resolve(),
    });
    await expect(p).rejects.toMatchObject({ tipo: 'limite' });
  });

  it.each([
    [401, 'permiso'],
    [403, 'permiso'],
    [404, 'no-encontrado'],
    [412, 'conflicto'],
    [500, 'desconocido'],
  ])('traduce HTTP %i a "%s"', async (status, tipo) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respuesta(status))),
    );
    const p = crearCliente(token).peticion('https://x', { scopes: ['s'], method: 'PATCH' });
    await expect(p).rejects.toMatchObject({ tipo });
  });

  it('el mensaje de permisos pide avisar a IT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respuesta(403))),
    );
    const p = crearCliente(token).peticion('https://x', { scopes: ['s'] });
    await expect(p).rejects.toThrow('No tienes permiso para hacer esto. Avisa a IT.');
  });

  it('detecta filtros sobre columnas sin índice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(respuesta(400, 'Field Estado cannot be referenced... is not indexed')),
      ),
    );
    const p = crearCliente(token).peticion('https://x', { scopes: ['s'] });
    await expect(p).rejects.toMatchObject({ tipo: 'configuracion' });
  });

  it('un fallo de red en escritura no se reintenta', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', fetchMock);
    const p = crearCliente(token).peticion('https://x', { scopes: ['s'], method: 'POST' });
    await expect(p).rejects.toBeInstanceOf(AppError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('calcula la espera con Retry-After o exponencial', () => {
    expect(esperaReintento('3', 0)).toBe(3000);
    expect(esperaReintento(null, 2)).toBe(4000);
    expect(esperaReintento('9999', 0)).toBe(30_000);
  });
});
