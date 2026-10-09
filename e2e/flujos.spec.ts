import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible();
});

test('muestra el banner de modo demo', async ({ page }) => {
  await expect(page.getByRole('note')).toContainText('Modo demo');
});

test('crear una incidencia desde el botón Nuevo', async ({ page }) => {
  await page.getByRole('link', { name: 'Nuevo' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva incidencia' })).toBeVisible();

  // Validación en línea: sin título ni tipo no deja guardar
  await page.getByRole('button', { name: 'Guardar incidencia' }).click();
  await expect(page.getByText('Escribe un título corto.')).toBeVisible();
  await expect(page.getByText('Elige el tipo.')).toBeVisible();
  await expect(page.getByLabel(/^Título/)).toBeFocused();

  await page.getByLabel(/^Título/).fill('Grifo gotea en el baño');
  await page.getByLabel(/^Área/).selectOption('Mayordomía');
  await page.getByLabel(/^Tipo/).selectOption('Incidencia');
  await page.getByRole('radio', { name: 'Urgente' }).check();
  await page.getByLabel('Habitación o lugar').fill('402');
  await expect(page.getByText(/No escribas nombres de huéspedes/)).toBeVisible();
  await page.getByRole('button', { name: 'Guardar incidencia' }).click();

  await expect(page.getByText('Incidencia guardada.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Grifo gotea en el baño/ })).toBeVisible();
});

test('mover de estado con el botón y verlo en Resuelto', async ({ page }) => {
  await page.goto('/area/botones');
  const pendiente = page.getByRole('region', { name: /^Pendiente/ });
  const resuelto = page.getByRole('region', { name: /^Resuelto/ });
  const tarjeta = pendiente.getByRole('listitem').filter({ hasText: 'Subir equipaje a la 512' });

  await tarjeta.getByRole('button', { name: /Avanzar a En curso/ }).click();
  await expect(page.getByText('Movida a "En curso".')).toBeVisible();
  const enCurso = page.getByRole('region', { name: /^En curso/ });
  const movida = enCurso.getByRole('listitem').filter({ hasText: 'Subir equipaje a la 512' });
  await expect(movida).toBeVisible();

  await movida.getByRole('button', { name: /Marcar resuelta/ }).click();
  await expect(resuelto.getByText('Subir equipaje a la 512')).toBeVisible();

  // Lo resuelto deja de verse en el panel de inicio (navegando dentro de la app: la demo
  // vive en memoria y una recarga la reinicia).
  await page.getByRole('link', { name: 'Incidencias', exact: true }).click();
  await page.getByRole('button', { name: /Botones/ }).click();
  await expect(page.getByRole('link', { name: /Subir equipaje a la 512/ })).toHaveCount(0);
});

test('añadir una nota de seguimiento', async ({ page }) => {
  await page.goto('/incidencia/1');
  await expect(page.getByRole('heading', { name: 'Aire acondicionado no enfría' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir nota' }).click();
  await expect(page.getByText('Escribe la nota antes de añadirla.')).toBeVisible();
  await page.getByLabel('Añadir nota').fill('Técnico en camino, llega en 10 minutos.');
  await page.getByRole('button', { name: 'Añadir nota' }).click();
  await expect(page.getByText('Nota añadida.')).toBeVisible();
  const notas = page.getByRole('region', { name: 'Seguimiento' }).getByRole('listitem');
  await expect(notas.last()).toContainText('Lucía Martín');
  await expect(notas.last()).toContainText('Técnico en camino');
  await expect(page.getByLabel('Añadir nota')).toHaveValue('');
});

test('filtrar con chips y buscador', async ({ page }) => {
  await page.getByRole('button', { name: 'Urgentes' }).click();
  await expect(page.getByRole('button', { name: 'Urgentes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('link', { name: /Llave de la 301 no abre/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Almohadas extra/ })).toHaveCount(0);

  await page.getByRole('searchbox').fill('301');
  await expect(page.getByRole('status').filter({ hasText: /resultado/ })).toHaveText('1 resultado');

  await page.getByRole('searchbox').fill('no existe nada así');
  await expect(page.getByText('Nada coincide con los filtros.')).toBeVisible();
});

test('el rol equipo no ve Dirección ni puede reasignar', async ({ page }) => {
  await page.goto('/direccion');
  await page.getByRole('note').getByRole('combobox').selectOption('equipo');
  await expect(page.getByText('Esta vista es solo para managers.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dirección' })).toHaveCount(0);
  await page.goto('/incidencia/1');
  await page.getByRole('note').getByRole('combobox').selectOption('equipo');
  await expect(page.getByText('Solo los managers pueden reasignar.')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Asignado a' })).toHaveCount(0);
});

test('Dirección muestra contadores para managers', async ({ page }) => {
  await page.goto('/direccion');
  await expect(page.getByText('urgentes abiertas', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Incidencias por área y estado' })).toBeVisible();
});

test('historial pagina con «Cargar más»', async ({ page }) => {
  await page.goto('/historial');
  const filas = page.getByRole('main').getByRole('listitem');
  await expect(filas).toHaveCount(25);
  await page.getByRole('button', { name: 'Cargar más' }).click();
  await expect(filas).not.toHaveCount(25);
});

test('sin scroll horizontal y botones táctiles de 44 px', async ({ page, isMobile }) => {
  for (const ruta of ['/', '/area/recepcion', '/nuevo', '/incidencia/9', '/direccion']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde, `scroll horizontal en ${ruta}`).toBeLessThanOrEqual(0);
  }
  if (isMobile) {
    await page.goto('/area/recepcion');
    const boton = page.getByRole('button', { name: /Avanzar a En curso/ }).first();
    const caja = await boton.boundingBox();
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('menú móvil abre y navega', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo en móvil');
  await page.getByRole('button', { name: 'Menú' }).click();
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Para reunión' })
    .click();
  await expect(page.getByRole('heading', { name: 'Para reunión', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden();
});

test('arrastrar una tarjeta entre columnas en escritorio', async ({ page, isMobile }) => {
  test.skip(isMobile, 'En táctil se usa el botón');
  await page.goto('/area/mayordomia');
  const origen = page
    .getByRole('region', { name: /^Pendiente/ })
    .getByRole('listitem')
    .filter({ hasText: 'Minibar sin reponer' });
  await origen.dragTo(page.getByRole('region', { name: /^En curso/ }));
  await expect(
    page
      .getByRole('region', { name: /^En curso/ })
      .getByRole('link', { name: 'Minibar sin reponer' }),
  ).toBeVisible();
});
