# Incidencias del departamento

Web app para que Mayordomía, Recepción y Botones registren y sigan incidencias, peticiones de huéspedes, errores internos, notas para reunión y traspasos de turno. Sustituye al cuaderno de OneNote: cada persona ve lo suyo de un vistazo, lo urgente destaca y lo resuelto se archiva solo.

**Los datos no salen del Microsoft 365 de la empresa.** La app no tiene base de datos propia: lee y escribe en la lista de Microsoft Lists **«Incidencias del departamento»** del sitio de SharePoint del equipo, con la cuenta de cada persona y sus permisos.

---

## Índice

1. [Ver la app en modo demo](#1-ver-la-app-en-modo-demo)
2. [Guía para IT: registro en Entra ID](#2-guía-para-it-registro-en-entra-id)
3. [Cambios en la lista de SharePoint](#3-cambios-en-la-lista-de-sharepoint)
4. [Publicar en Azure Static Web Apps](#4-publicar-en-azure-static-web-apps)
5. [Si algo falla](#5-si-algo-falla)
6. [Normas de protección de datos para el equipo](#6-normas-de-protección-de-datos-para-el-equipo)
7. [Qué hace la app (resumen funcional)](#7-qué-hace-la-app)
8. [Para quien mantenga el código](#8-para-quien-mantenga-el-código)

---

## 1. Ver la app en modo demo

El modo demo funciona **sin login y sin conectarse a Microsoft**. Trae unas 30 incidencias de ejemplo inventadas. Lo que cambies se pierde al recargar la página. Un selector arriba permite simular la vista de **manager** o de **equipo**.

### Opción rápida (sin instalar nada)

Abre el enlace de vista previa que te hemos compartido. Es la misma app en modo demo.

### Demo pública en GitHub Pages

El repositorio publica la demo sola cada vez que se actualiza la rama `main` (archivo `.github/workflows/pages.yml`). Hay que activarlo una vez:

1. En GitHub, entra en este repositorio → **Settings → Pages**.
2. En **Source** elige **GitHub Actions**.
3. Ve a **Actions → Demo en GitHub Pages → Run workflow** (o espera al siguiente cambio en `main`).
4. La demo queda en `https://kaeldafae.github.io/ORGANIZACION/`.

Es una página pública: cualquiera con el enlace la ve. Solo contiene datos inventados y no se conecta a Microsoft 365, así que no expone nada del hotel. La app real (con login) se publica aparte en Azure (apartado 4).

### En tu ordenador

Solo hace falta una vez:

1. Instala **Node.js** (versión 22 o superior): entra en <https://nodejs.org>, descarga la versión «LTS» y sigue el instalador con las opciones por defecto.
2. En GitHub, en la página de este repositorio, pulsa **Code → Download ZIP** y descomprime el archivo en tu escritorio.
3. Abre una terminal dentro de esa carpeta:
   - **Windows:** abre la carpeta, haz clic en la barra de dirección, escribe `cmd` y pulsa Intro.
   - **Mac:** clic derecho en la carpeta → **Servicios → Nuevo terminal en la carpeta**.
4. Escribe esto y pulsa Intro (tarda un par de minutos la primera vez):

   ```
   npm install
   ```

Cada vez que quieras verla:

5. En la misma terminal escribe:

   ```
   npm run dev:demo
   ```

6. Abre en el navegador la dirección que aparece (normalmente <http://localhost:5173>).
7. Para pararla, vuelve a la terminal y pulsa `Ctrl + C`.

---

## 2. Guía para IT: registro en Entra ID

> Este apartado es para el departamento de IT. Tiempo estimado: 30–45 minutos.

### 2.1 Registrar la aplicación

En el **Centro de administración de Microsoft Entra → Identidad → Aplicaciones → Registros de aplicaciones → Nuevo registro**:

| Campo                          | Valor                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Nombre                         | `Incidencias del departamento`                                                                  |
| Tipos de cuenta compatibles    | Solo cuentas de este directorio organizativo (un inquilino)                                     |
| URI de redirección: plataforma | **Aplicación de página única (SPA)**                                                            |
| URI de redirección: valor      | La dirección pública de la app, p. ej. `https://<nombre>.azurestaticapps.net` (sin barra final) |

Añade también `http://localhost:5173` como segundo URI de redirección SPA si alguien va a probar contra la lista real desde su ordenador.

- **No crees secretos ni certificados.** Es una aplicación de página única con flujo de código de autorización y PKCE; no guarda secretos en el navegador.
- En **Autenticación**, deja desactivadas las casillas de «Tokens de acceso» y «Tokens de id» (concesión implícita). No hacen falta.

### 2.2 Permisos delegados

En **Permisos de API → Agregar un permiso**. Todos son **delegados**: la app actúa como la persona que ha iniciado sesión y nunca puede hacer más de lo que esa persona puede hacer en SharePoint.

| API             | Permiso                                                      | Para qué                                                                        |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Microsoft Graph | `User.Read`                                                  | Nombre, correo y departamento de quien entra                                    |
| Microsoft Graph | **Una de las dos:** `Sites.ReadWrite.All` o `Sites.Selected` | Leer y escribir la lista                                                        |
| Microsoft Graph | `GroupMember.Read.All` _(opcional, ver 2.3)_                 | Saber si la persona es manager                                                  |
| SharePoint      | `AllSites.Write` _(o `Sites.Selected` de SharePoint)_        | Solo para **adjuntar fotos** (Graph no gestiona adjuntos de elementos de lista) |

**`Sites.ReadWrite.All` frente a `Sites.Selected`:**

- `Sites.ReadWrite.All` (delegado): la app puede tocar cualquier sitio **al que ya tenga acceso la persona**. Es lo más sencillo.
- `Sites.Selected` (delegado): además de los permisos de la persona, hay que conceder a la aplicación acceso explícito a **este** sitio. Es lo más restrictivo y lo recomendado si la política de la empresa lo exige. En ese caso pon `VITE_GRAPH_SITES_SCOPE=Sites.Selected` y, para las fotos, el permiso equivalente de SharePoint en `VITE_SHAREPOINT_SCOPE`.

Al terminar, pulsa **Conceder consentimiento de administrador** para que el equipo no vea pantallas de consentimiento.

### 2.3 Grupo de managers

1. Crea un **grupo de seguridad** en Entra ID (p. ej. `Incidencias - Managers`) y añade a los managers.
2. Copia su **Id. de objeto** → irá en `VITE_MANAGERS_GROUP_ID`.
3. Para saber si alguien es manager, la app hace esto, en orden:
   - Si el token trae la reclamación `groups` (la activas en **Configuración de token → Agregar reclamación de grupos → Grupos de seguridad**), la usa directamente y **no necesita `GroupMember.Read.All`**. Es la opción recomendada.
   - Si no viene, consulta `POST /me/checkMemberGroups`, que necesita el permiso de 2.2.
   - Si nada de lo anterior funciona, trata a la persona como «equipo».

> **Importante:** los roles «manager» y «equipo» solo deciden **qué se ve en pantalla**. La seguridad real son los permisos de SharePoint sobre la lista. Si alguien no debe poder modificar incidencias, quítale el permiso en la lista, no en la app.

### 2.4 Valores para el archivo `.env`

Copia `.env.example` como `.env` (o ponlos como variables en el despliegue, apartado 4) con:

| Variable                   | De dónde sale                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `VITE_TENANT_ID`           | Entra ID → Información general → Id. de inquilino                                        |
| `VITE_CLIENT_ID`           | El registro de la app → Id. de aplicación (cliente)                                      |
| `VITE_REDIRECT_URI`        | El mismo URI de redirección registrado (si se deja vacío, se usa la dirección de la app) |
| `VITE_SHAREPOINT_SITE_URL` | La dirección del sitio de Teams, p. ej. `https://empresa.sharepoint.com/sites/Equipo`    |
| `VITE_LIST_NAME`           | `Incidencias del departamento`                                                           |
| `VITE_MANAGERS_GROUP_ID`   | Id. de objeto del grupo de 2.3                                                           |
| `VITE_GRAPH_SITES_SCOPE`   | `Sites.ReadWrite.All` o `Sites.Selected`                                                 |
| `VITE_SHAREPOINT_SCOPE`    | Vacío = `https://<empresa>.sharepoint.com/AllSites.Write`                                |
| `VITE_TIMEZONE`            | `Europe/Madrid` (o `Atlantic/Canary`)                                                    |
| `VITE_TURNOS`              | `Mañana=7-15,Tarde=15-23,Noche=23-7`                                                     |
| `VITE_MAX_FOTO_MB`         | `5`                                                                                      |

**Ninguno de estos valores es secreto.** Toda app web los expone al navegador, y así está diseñado por Microsoft para las aplicaciones de página única. Aun así, no se escriben en el código, para poder cambiar de entorno sin tocarlo.

Si falta alguno o es incorrecto, la app no arranca a medias: muestra la pantalla «Falta configurar la app» con la lista exacta de lo que hay que corregir.

### 2.5 Área de cada persona

La app abre primero el área de cada persona. La toma del campo **Departamento** de su usuario en Entra ID si coincide con un área (Mayordomía, Recepción, Botones, General). Si no coincide, la app se lo pregunta una vez y lo recuerda en ese navegador. Rellenar el departamento en Entra ID ahorra ese paso.

---

## 3. Cambios en la lista de SharePoint

Hay que hacerlos **antes** de conectar la app. Si falta algo, la app lo indica al arrancar («Falta la columna …»).

### 3.1 Columnas nuevas

En la lista → **Agregar columna**:

| Nombre exacto           | Tipo                   | Configuración                                                                               |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| **Seguimiento**         | Varias líneas de texto | **Texto sin formato** (sin texto enriquecido). **«Anexar cambios al texto existente»: NO**. |
| **Fecha de resolución** | Fecha y hora           | Incluir la hora: **Sí**. No obligatoria. Sin valor por defecto.                             |

¿Por qué «Fecha de resolución»? Para mostrar «resuelto en las últimas 24 h» y contar las resueltas en 7 y 30 días hace falta saber **cuándo** se resolvió algo. La fecha de modificación no sirve: cambia con cualquier edición, por ejemplo al añadir una nota después de resolver. La app la rellena al pasar a «Resuelto» y la borra si se reabre.

¿Por qué el seguimiento sin «anexar cambios»? La app ya añade cada nota al final con fecha, hora y autor, y nunca reescribe las anteriores. Si se activa esa opción, SharePoint guarda las notas en el historial de versiones y la app no las vería.

### 3.2 Comprobar las columnas existentes

Las columnas **Área, Tipo, Prioridad, Turno, Estado** deben ser de tipo **Elección**. **Asignado a** debe ser **Persona**. **Habitación** y **Descripción** deben ser de texto. Los valores de los desplegables se leen de la lista, así que puedes añadir opciones nuevas sin tocar la app. Estos valores, en cambio, tienen que existir tal cual:

- Estado: `Pendiente`, `En curso`, `Resuelto`
- Prioridad: `Urgente`, `Normal`, `Baja`
- Tipo: `Nota para reunión` (para la vista «Para reunión»)

### 3.3 Índices (obligatorio)

SharePoint deja de filtrar listas de más de 5.000 elementos si las columnas no están indexadas. Con el volumen de este equipo, ese límite se alcanza en uno o dos años. La app filtra en el servidor, así que **necesita los índices desde el principio**.

En la lista → **Configuración → Configuración de lista → Columnas indizadas → Crear un índice nuevo**, uno por cada columna:

1. Estado
2. Área
3. Prioridad
4. Tipo
5. Asignado a
6. Fecha de resolución
7. Modificado
8. Creado

La app **no** usa la cabecera `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly`, que solo es un parche. Si falta un índice, muestra «Faltan índices en la lista de SharePoint. Avisa a IT».

### 3.4 Permisos de la lista

- Todo el equipo: **Editar** (crear, comentar, cambiar estado).
- Si quieres que la regla «solo los managers reasignan» sea seguridad real y no solo de pantalla, tendría que hacerse con un flujo de Power Automate o separando listas. La app no puede imponerla por sí sola.
- Las reglas de aviso por correo que ya existen en la lista (urgentes a managers, aviso al asignado) siguen funcionando igual; la app no las toca.

### 3.5 Conservación del historial

Lo decide dirección. Para aplicarlo, IT puede configurar una **directiva de retención de Microsoft Purview** sobre el sitio o la lista. La app no borra nada por su cuenta.

---

## 4. Publicar en Azure Static Web Apps

> Para IT. La app es una web estática: no hay servidor ni base de datos que mantener.

### 4.1 Plan

- **Free:** suficiente para empezar. No tiene acuerdo de nivel de servicio (SLA). Si un día no está disponible, los datos siguen a salvo en la lista y se pueden consultar desde Microsoft Lists o Teams.
- **Standard:** con SLA. Elígelo si dirección quiere garantía de disponibilidad.

### 4.2 Crear el recurso

1. Portal de Azure → **Crear un recurso → Static Web App**.
2. Suscripción y grupo de recursos de la empresa. Región: **West Europe**.
3. Origen: **GitHub** → este repositorio, rama `main`.
4. Valores de compilación:
   - Valores preestablecidos: **Custom**
   - Ubicación de la aplicación: `/`
   - Ubicación de la API: _(vacío)_
   - Ubicación de salida: `dist`
5. Azure añade un archivo de flujo de trabajo en `.github/workflows/` del repositorio. Edítalo y, dentro del paso `Build And Deploy`, añade las variables (mejor como **variables del repositorio** en GitHub → Settings → Secrets and variables → Actions → Variables):

   ```yaml
   env:
     VITE_TENANT_ID: ${{ vars.VITE_TENANT_ID }}
     VITE_CLIENT_ID: ${{ vars.VITE_CLIENT_ID }}
     VITE_REDIRECT_URI: ${{ vars.VITE_REDIRECT_URI }}
     VITE_SHAREPOINT_SITE_URL: ${{ vars.VITE_SHAREPOINT_SITE_URL }}
     VITE_LIST_NAME: ${{ vars.VITE_LIST_NAME }}
     VITE_MANAGERS_GROUP_ID: ${{ vars.VITE_MANAGERS_GROUP_ID }}
     VITE_GRAPH_SITES_SCOPE: ${{ vars.VITE_GRAPH_SITES_SCOPE }}
   ```

6. Cuando termine la primera publicación, copia la dirección `https://….azurestaticapps.net` y añádela como URI de redirección SPA en el registro de la app (apartado 2.1).
7. _(Opcional)_ Dominio propio, p. ej. `incidencias.hotel.com`: **Dominios personalizados** en el recurso. Añade también ese dominio como URI de redirección.

### 4.3 Seguridad del alojamiento

Al compilar se genera `staticwebapp.config.json` con:

- **Content-Security-Policy** restrictiva: solo permite conectar con Microsoft (`login.microsoftonline.com`, `graph.microsoft.com` y el SharePoint de la empresa). Bloquea scripts externos y que otra web incruste la app.
- Cabeceras `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Reescritura de rutas para que funcionen los enlaces directos (p. ej. `/incidencia/42`).

El dominio de SharePoint se toma de `VITE_SHAREPOINT_SITE_URL`. Si no es un `*.sharepoint.com` válido, **la compilación falla a propósito**.

### 4.4 Alternativa sin reescritura de rutas

Si IT prefiere otro alojamiento estático que no reescriba rutas, compila con `VITE_ROUTER_MODE=hash` (las direcciones serán del tipo `/#/incidencia/42`) y aplica en ese servidor las mismas cabeceras de seguridad.

---

## 5. Si algo falla

| Lo que se ve                                                               | Causa probable                                                                      | Solución                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft muestra **AADSTS50011** al entrar                                | La dirección de la app no coincide con el URI de redirección registrado             | Añade la dirección exacta (sin barra final) como URI de tipo **SPA** (2.1)                                                                                                                         |
| «**No tienes permiso para hacer esto. Avisa a IT.**»                       | Falta el consentimiento de administrador, o la persona no tiene permiso en la lista | Concede el consentimiento (2.2). Comprueba que la persona es miembro del equipo de Teams o tiene permiso de edición en la lista (3.4). Con `Sites.Selected`, que se ha concedido el sitio a la app |
| «**Faltan índices en la lista de SharePoint**»                             | Alguna columna filtrada no está indexada                                            | Crea los índices de 3.3                                                                                                                                                                            |
| «**La lista no tiene la estructura esperada: Falta la columna …**»         | Falta una columna o tiene otro tipo u otro nombre                                   | Revisa 3.1 y 3.2. El mensaje dice exactamente qué columna falla                                                                                                                                    |
| «**Mis asignadas**» no muestra nada, o aparece «**Persona no encontrada**» | La persona aún no figura en la lista de usuarios del sitio                          | Que esa persona abra una vez el sitio de SharePoint o la lista desde Teams. Después, pulsa el botón de actualizar de la app                                                                        |

Otros casos:

- **Las fotos no se suben:** falta el permiso de SharePoint (2.2) o su consentimiento. El resto de la app funciona igual.
- **«No hay conexión»:** problema de red del dispositivo. La app reintenta sola las consultas.
- **Sale la pantalla «Falta configurar la app»:** falta alguna variable del apartado 2.4. La pantalla dice cuál.

---

## 6. Normas de protección de datos para el equipo

> Resumen para el personal. Referencias: Reglamento (UE) 2016/679 (RGPD), arts. 5.1.c y 9, y Ley Orgánica 3/2018 (LOPDGDD). Nivel normativo: europeo y estatal.

**Sí se puede escribir:**

- Número de habitación o lugar («214», «Suite 3», «Lobby»).
- Qué pasa y qué hay que hacer («Aire no enfría», «Cuna antes de las 18:00»).
- «Ver ficha en PMS» para cualquier dato del huésped.

**No se puede escribir:**

- Nombres, apellidos, teléfonos, correos o documentos de huéspedes.
- **Alergias, intolerancias, embarazos, discapacidades ni ningún dato de salud** (son categorías especiales del art. 9 RGPD).
- Datos de pago: tarjetas, IBAN, importes de cargos.
- Opiniones personales sobre huéspedes o compañeros.

**Por qué:** el principio de **minimización** (art. 5.1.c RGPD) obliga a registrar solo lo necesario. Para atender una incidencia basta con la habitación; los datos del huésped ya están en el PMS, que es donde deben estar.

**Para dirección:**

- La app registra quién crea, modifica y resuelve cada incidencia; son datos del personal. Conviene informar al equipo (art. 13 RGPD) con una nota breve, por ejemplo: _«Para coordinar el trabajo del departamento, la app de incidencias registra tu nombre y la fecha y hora de lo que creas o modificas. Los datos se guardan en el Microsoft 365 de la empresa durante [plazo] y solo los ve el departamento.»_ Base jurídica: la ejecución de la relación laboral o el interés legítimo de la empresa (art. 6.1.b o 6.1.f RGPD). Confírmalo con el delegado de protección de datos, si lo hay.
- La app **no se usa para medir rendimiento individual**. Si un día se quisiera, habría que valorarlo antes con el DPO y la representación legal de los trabajadores.
- **Plazo de conservación:** lo fija dirección y lo aplica IT (3.5). Recomendación: el mínimo útil para el trabajo diario y las reuniones (por ejemplo, 12 meses).
- La app comprime las fotos en el propio dispositivo y, al hacerlo, **elimina la ubicación GPS y otros metadatos** antes de subirlas. Aun así: nunca fotografiar a huéspedes ni documentos con datos personales.

---

## 7. Qué hace la app

- **Inicio:** filtros rápidos (Mis asignadas, Urgentes, Hoy, Para reunión) que se combinan entre sí, buscador, contadores por área (en rojo si hay urgentes) y bloques plegables por área; el de tu área sale abierto. Lo resuelto no aparece; un bloque al final lleva al historial.
- **Área (tablero):** columnas Pendiente → En curso → Resuelto, con las urgentes arriba. En el ordenador se arrastran las tarjetas; en todos los dispositivos hay un botón «Avanzar». La columna Resuelto solo muestra las últimas 24 h.
- **Nueva incidencia** (botón «+ Nuevo», siempre visible): área y turno vienen preseleccionados, la validación aparece junto a cada campo y se puede adjuntar una foto.
- **Detalle:** todos los datos, cambio de estado, reasignación (solo managers) y seguimiento. Cada nota queda con fecha, hora y autor y no se puede editar.
- **Traspaso de turno:** lo creado en las últimas 24 h, por área.
- **Para reunión:** notas para reunión sin resolver, por área.
- **Dirección** (solo managers): matriz área × estado, urgentes abiertas, abiertas hace más de 7 días y resueltas en 7 y 30 días.
- **Historial:** resueltas, de la más reciente a la más antigua, con buscador y «Cargar más».
- Se actualiza sola cada 60 s mientras la pestaña está visible, y tiene botón de actualizar. Los cambios se ven al momento y, si Microsoft los rechaza, se deshacen con un aviso.
- Modo claro y oscuro según el dispositivo. Usable con teclado y lector de pantalla.

---

## 8. Para quien mantenga el código

React 19 + TypeScript (modo `strict`) + Vite, sin servidor propio. Dependencias de producción: React y MSAL.

```
src/
  domain/   Lógica pura: turnos, filtros, permisos de interfaz, seguimiento, validación, estadísticas
  data/     IncidenciasRepository y sus dos versiones (GraphRepository, DemoRepository), cliente HTTP, mapeo de columnas
  auth/     MSAL (login, tokens) y carga del usuario y su rol
  state/    Estado compartido: incidencias (refresco y cambios optimistas), sesión, área, avisos
  router/   Router mínimo (rutas normales o con #)
  features/ Una pantalla por archivo
  ui/       Componentes comunes
tests/      Pruebas unitarias (Vitest)
e2e/        Pruebas de flujos en modo demo (Playwright), escritorio y móvil
```

| Orden                   | Qué hace                                                        |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev:demo`      | App en modo demo con recarga en caliente                        |
| `npm run dev`           | App contra Microsoft 365 (necesita `.env`)                      |
| `npm run check`         | Tipos, lint, formato, pruebas unitarias y compilación           |
| `npm run e2e`           | Pruebas de flujos con Playwright                                |
| `npm run build`         | Compilación de producción en `dist/`                            |
| `npm run build:preview` | Versión demo para alojamiento estático sin reescritura de rutas |

Decisiones técnicas relevantes:

- Los **nombres internos** de las columnas no se adivinan: al arrancar se leen con `GET /sites/{id}/lists/{id}/columns` y se construye el mapa nombre visible → nombre interno (`src/data/columnas.ts`).
- **Asignado a:** las columnas de persona guardan el id de usuario **del sitio**, no el de Entra ID. La app lo obtiene de la lista oculta «User Information List» del sitio (`/lists/User Information List/items`) y escribe `<columna>LookupId`.
- **Seguimiento:** cada nota se añade con control de versión (`If-Match` con el `eTag` del elemento). Si otra persona guardó a la vez, la app relee y reintenta, hasta 3 veces.
- **Errores de Graph:** 401/403 → «No tienes permiso…», 404, 409/412, 429/503 con reintento según `Retry-After`, y fallos de red. Nunca se muestran trazas técnicas.
- **Paginación:** sigue `@odata.nextLink`, y solo enlaces de `graph.microsoft.com` (el token no se envía a otros dominios). El historial carga 25 por página.

### Pendiente de verificar en el tenant real

Esta versión no se ha probado contra un tenant real y la documentación oficial de Microsoft no estaba accesible desde el entorno donde se escribió. IT debe comprobar al conectarla:

1. Acceso a la lista oculta por nombre: `GET /sites/{id}/lists/User Information List/items`.
2. `PATCH …/items/{id}/fields` con `If-Match` (devuelve 412 si hay conflicto) y `"<columna>LookupId": null` para dejar sin asignar.
3. Filtro `ne` sobre Estado y `$orderby=fields/Modified desc` con los índices de 3.3.
4. Subida de fotos con `…/AttachmentFiles/add(FileName='…')` desde el navegador con token de SharePoint (CORS y permiso `AllSites.Write`). Si no funciona, las fotos quedan para una segunda fase y el resto de la app no se ve afectado.
5. Permiso mínimo de `POST /me/checkMemberGroups`, o activar la reclamación `groups` (2.3).
