# Pendientes de FoodTrack web

Estado al 28/10/2026. **La app está en producción:** https://food-track-web.vercel.app (Vercel), conectada a la base real en Supabase. Funcionan el mapa, la búsqueda, los filtros, el modal de menú, los aportes con moderación, el perfil y el panel de admin.

Lo que sigue está ordenado por prioridad. Cada ítem es una casilla para tachar cuando se resuelve.

Revisión del backlog: las aclaraciones de implementación se contrastaron con el código local. Esta revisión no verifica nuevamente producción ni reemplaza las pruebas de registro, instalación y cámara en dispositivos reales que siguen pendientes.

---

## 🔴 1. Bloqueantes para usar la app de verdad

- [x] **Base en Supabase** (proyecto `shqlyaqbymsngvakpwyw`, us-east-1): esquema y 28 restaurantes aplicados con `supabase db push --include-seed`. Verificado vía API: anónimo ve 28 aprobados, no puede insertar ni moderar, `restaurants_nearby` responde.
- [x] **Tests de base y RLS implementados** contra Postgres + PostGIS local (PGlite): `supabase/tests/db.test.mjs` cubre moderación, permisos, notas de admin, calificaciones y favoritos (`npm run test:db`, incluido en la CI).
- [ ] **Repetir las verificaciones de permisos y moderación contra Supabase real**, con cuentas y datos de prueba controlados. La suite local no reemplaza esta validación.
- [x] **Primer admin:** la cuenta `gianni` es admin (28/10/2026). Para sumar otro: `npx supabase db query --linked "update public.profiles set role='admin' where username='…'"`.
- [x] **Login con nombre de usuario funcionando en producción** (28/10/2026), tras recargar `SUPABASE_SECRET_KEY` revelada. `api/login` registra en los logs de Vercel en qué paso falla cada intento.
- [x] **El modo demo ya no se activa solo en producción:** sin credenciales, la build publicada muestra "Falta configurar el backend". Para publicar una demo a propósito: `EXPO_PUBLIC_DEMO=true`.
- [x] **Deploy en Vercel:** https://food-track-web.vercel.app (proyecto `food-track2/food-track-web`, deploy automático en cada push a `main`, variables `EXPO_PUBLIC_SUPABASE_URL`/`KEY` cargadas en Production y Preview).
- [x] **Supabase Auth → URL Configuration:** Site URL = `https://food-track-web.vercel.app` y Redirect URL `https://food-track-web.vercel.app/**`.
- [ ] **Probar el registro real de punta a punta:** crear la cuenta en la web, confirmar el email y verificar que el link lleve a la app.
- [ ] **Escaneo de QR en celulares reales** (Chrome Android y Safari iOS) sobre HTTPS. Si `onBarcodeScanned` de `expo-camera` no detecta bien en web, hay que implementar un fallback con `@zxing/browser` en un `qr-scanner.web.tsx`.

## 📱 Sensación de app nativa (hecho el 28/10/2026)

- [x] Instalable desde la pantalla de inicio: `public/manifest.json`, `public/index.html` con meta tags de iOS y Android, ícono propio (`assets/branding/icon.svg` → PNG).
- [x] Sin zoom de página, selección de texto, rebote ni "pull to refresh" fuera del modal de menú. Dentro del modal el zoom se habilita (`src/lib/page-zoom.web.ts`).
- [x] Barra de tabs fija: el documento nunca se desplaza y la barra se oculta con el teclado abierto.
- [x] La cámara se apaga al salir de la pestaña Aportar (`useIsFocused`).
- [x] Login con email **o** nombre de usuario (`api/login.ts`; el email nunca llega al cliente).
- [x] Categorías del mapa colapsables (botón junto al buscador).
- [x] Confirmación al cerrar sesión y al retirar un aporte (`ConfirmDialog`).
- [x] Animaciones de navegación: entrada de pantallas, pestañas, ficha del lugar, resultados y categorías (`src/components/motion.tsx`).
- [x] Tema claro, oscuro o el del sistema (Perfil → Apariencia), incluido el mapa. En web usa variables CSS; en nativo, por ahora, solo el claro.
- [x] **Posición de los HUD por zonas seguras** (`src/hooks/use-header-offset.ts`): encabezado = alto de la barra de estado + 12px; barra de tabs = 12px + (inset inferior − 20px). En iOS instalada, la barra de estado es `black-translucent` (la app pinta esa franja: fondo en oscuro, naranja en claro, `status-bar-scrim.tsx`); como iOS reciente informa `safe-area-inset-top` = 0, el alto se estima por tamaño de pantalla (59/48/20px). iOS toma el estilo al **agregar** la app al inicio: si cambia, hay que borrarla y volver a agregarla. Diagnóstico: `?debug=1`.
- [x] Usuarios mostrados como `@Usuario` (primera letra en mayúscula) en todos lados (`displayUsername`).
- [x] Contraseña: botón para verla u ocultarla; tras un login fallido, la primera tecla de borrar la vacía entera; al crear cuenta se pide repetirla.
- [x] **Notas del equipo** (solo admins) en Perfil: tabla `admin_notes` con RLS (migración `20261028000000`), crear, marcar como hecha y borrar.
- [ ] **Probar en iPhone y Android instalada** (Compartir → "Agregar a inicio" / menú → "Instalar app"): zoom, barra de estado, teclado y cámara.
- [ ] **Verificar la franja vacía debajo de la navegación en iOS instalada:** corrección local en `src/global.css` para usar `100vh` sin fijar `html/body` en modo standalone. Falta confirmar en iPhone después de publicar: abrir en frío, rotar, abrir/cerrar el teclado y volver desde segundo plano. El diagnóstico ahora muestra también el tamaño del documento y de `#root`.
- [ ] **Rate limit del login con usuario:** las llamadas a Supabase salen desde las IPs de Vercel. Con mucho tráfico conviene limitar los intentos por usuario.

## 🟠 2. Funcionalidad que falta

- [x] **Modo "cerca tuyo" estilo Airbnb** (28/10/2026): panel deslizable sobre el mapa con 3 posiciones (escondido / media altura / completo con botón "Mapa"), tarjetas con fotos deslizables, ★ promedio (calificaciones de usuarios, tabla `ratings` + vista `restaurant_rating_stats`), distancia y orden por cercanía, ♥ favoritos (tabla `favorites`, filtro en el panel), mini-mapa, "Ver menú", "Calificar" y "Cómo llegar". Componentes: `nearby-sheet.tsx`, `restaurant-card.tsx`, `photo-carousel.tsx`, `rating-dialog.tsx`.
- [ ] **Fotos reales de los lugares:** hoy las tarjetas muestran ilustraciones por categoría (`category-art.tsx`). Pendiente decidir quién las sube (usuarios con moderación o solo admins), guardarlas en Supabase Storage y pasarlas a `PhotoCarousel` (ya acepta cualquier contenido por slide).
- [ ] **Badge destacado en las tarjetas** ("Mejor valorado", "Nuevo"…): ver la nota "[FUTURO] Badge destacado" en *Notas del equipo* (Perfil, admins), con el contexto completo.
- [ ] **Idea de la nota del equipo "Carrousel entre los menu modal"** (estilo Instagram: scroll vertical cambia de lugar, lateral cambia de foto, y desde la preview se llega al menú). El panel de tarjetas cubre la base; falta la versión a pantalla completa navegable desde el modal de menú.
- [ ] **[A DEFINIR] Modo admin para editar la base desde la app:** que los admins puedan crear, editar, despublicar y borrar restaurantes, cambiar categorías, corregir links y ubicaciones, y gestionar usuarios (roles y puntos) sin pasar por el SQL Editor. Se apoya en el ítem "Admin: gestionar lo ya publicado".
- [ ] **[A DEFINIR] Animación de bienvenida** al abrir la app: splash animado con el logo y/o una introducción de 2 o 3 pasos la primera vez.
- [x] **Modal de menú dentro de la app** (`src/components/menu-modal/`): vista previa con estado (Verificando → Cargando → Menú cargado). `api/menu-preview.ts` (función de Vercel) verifica cada link: si se deja embeber, convierte Google Drive a `/preview` y detecta PDF. 17 de 28 menús de la v1 se ven dentro de la app.
- [ ] **Corregir los menús rotos de la v1:** Blossom, El Querandí y Saint Elmo dan 404; Soffice es un Drive privado; Adelmo no resuelve DNS. Hay que pedir los links nuevos o despublicarlos desde el panel de admin.
- [ ] **Menús que bloquean el iframe** (McDonald's, KFC, Starbucks, Garibaldi, Fabric Sushi, Vecino): en web solo se pueden abrir afuera. En la app nativa sí se van a ver dentro (WebView no tiene esa restricción). Opcional: mostrar una captura de la página con un servicio de screenshots.
- [ ] **Recuperar contraseña** (`supabase.auth.resetPasswordForEmail`) y una pantalla para fijar la nueva.
- [ ] **Editar un aporte pendiente.** La base ya lo permite (vuelve a quedar pendiente), pero no hay UI.
- [ ] **Admin: gestionar lo ya publicado.** Falta poder despublicar o borrar restaurantes aprobados, ver el historial de rechazados y editar datos. Hoy el panel solo muestra la cola de pendientes.
- [ ] **Ficha compartible `/restaurant/[id]`** con URL propia (estaba en el plan; hoy la ficha es solo un panel sobre el mapa).
- [ ] **Encuadre inicial del mapa.** Arranca en el Obelisco con zoom 11.5 y los locales de zona norte (San Isidro, Olivos) quedan fuera de la vista. Convendría ajustar a los marcadores (`fitBounds`) o a la ubicación del usuario.
- [ ] **Escalar la consulta de restaurantes.** `listApproved` trae todos los aprobados y el panel "cerca tuyo" calcula y ordena distancias en el cliente (`src/app/(tabs)/index.tsx`, `src/lib/geo.ts`). La RPC `restaurants_nearby` existe y tiene una prueba local, pero la app no la llama. Evaluar usarla para consultas por cercanía, filtrar por área visible y agrupar pines cercanos (clustering) cuando crezca el volumen de datos.
- [ ] **Geocodificación:** autocompletar la dirección a partir del pin, o el pin a partir de la dirección.
- [ ] **Ranking de puntos.** Los puntos se suman al aprobar, pero no se muestran en ningún ranking.
- [ ] **Reportar datos incorrectos** de un lugar publicado (link roto, local cerrado).

## 🟡 3. Diseño, UX y marca

- [ ] **Completar la marca en los assets de Expo.** Los assets configurados en `app.json` (`assets/images/icon.png`, `favicon.png`, `splash-icon.png`, los íconos de Android y `assets/expo.icon` para iOS) siguen pendientes de revisión y reemplazo donde corresponda. Los íconos web de instalación en `public/icons/` ya existen; son un conjunto separado.
- [x] **Manifest e íconos de instalación web implementados:** `public/manifest.json` incluye íconos de 192/512 px y uno maskable; `public/index.html` enlaza el manifest y el ícono de inicio de iOS. La prueba de instalación en iPhone y Android sigue pendiente en "Sensación de app nativa".
- [ ] **Layout de escritorio:** lista lateral de resultados junto al mapa (hoy es el diseño mobile estirado).
- [ ] **Estados de carga y error:** skeletons en las listas y un aviso si no cargan los tiles del mapa.
- [ ] **Revisión de accesibilidad:** etiquetas en todos los botones con ícono, contraste y navegación con teclado.
- [ ] La fuente se carga desde Google Fonts con un `@import` en CSS. Evaluar `expo-font` o alojarla en el propio sitio.

## 👥 Colaboración en equipo

- [ ] **Vercel Hobby no permite invitar miembros** (Pro cuesta USD 20 por usuario por mes; la prueba de 14 días quita a los miembros al terminar). Plan gratuito propuesto:
  - Sumar a los compañeros como colaboradores del repo en GitHub. Con el repo **público**, sus pushes a `main` se publican igual. Si el repo pasa a privado, Vercel Hobby bloquea los deploys de commits de otras personas.
  - Trabajar con pull requests: cada PR genera una URL de preview. Para que se vean sin cuenta de Vercel, desactivar *Settings → Deployment Protection → Vercel Authentication*.
  - Invitar a los compañeros a la organización de Supabase (*Organization → Team*), si el plan Free lo permite.
- [ ] Decidir si el repo queda público (recomendado: no tiene secretos) o pasa a privado.

## 🔵 4. Calidad y mantenimiento

- [ ] **Tests unitarios de la app:** agregar cobertura de `validation.ts` y del filtro del mapa. Los tests de base y RLS ya existen (ver sección 1).
- [ ] **Test e2e con Playwright** en `e2e/`: registro → aporte → aprobación → aparece en el mapa.
- [x] **CI en GitHub Actions configurada** con lint, typecheck, tests de base y build (`.github/workflows/ci.yml`). La primera ejecución fallaba en `npm ci` por el lockfile desincronizado y la carpeta `public/` faltante; se corrigió en `858bf1f`. El estado de la última ejecución debe consultarse en GitHub.
- [ ] **Tipos generados** desde el esquema con `npx supabase gen types typescript` (hoy `src/lib/api/types.ts` está escrito a mano).
- [ ] **Agregar `.gitattributes`** (`* text=auto eol=lf`) para evitar los avisos de LF/CRLF en Windows.
- [ ] **Revisar `npm audit`** (hay avisos en dependencias transitivas).
- [ ] **Keep-alive de Supabase:** el plan Free pausa el proyecto tras 7 días sin actividad. Se resuelve con un cron en GitHub Actions o pasando al plan Pro cuando haya usuarios.
- [ ] **Monitoreo de errores** (Sentry, opcional).

## 🟣 5. Camino a la app nativa

- [ ] **Tema dinámico en nativo:** web ya permite claro, oscuro o sistema. `useResolvedTheme` en `src/theme/theme-store.ts` devuelve siempre `light` fuera de web y `app.json` mantiene `userInterfaceStyle: "light"`.
- [ ] Implementar `src/components/restaurant-map/index.tsx` con `@maplibre/maplibre-react-native` respetando `RestaurantMapProps` (hoy muestra un marcador de lugar).
- [ ] Crear un **development build** con EAS: MapLibre nativo no corre en Expo Go. Falta agregar `eas.json`.
- [ ] Sesión en nativo: hoy usa AsyncStorage. Evaluar SecureStore cifrado y refrescar la sesión al volver a primer plano (`AppState` + `startAutoRefresh`).
- [ ] Probar cámara y ubicación en dispositivos físicos. Los textos de permisos ya están en `app.json`.
- [ ] Cuentas de tienda: Apple Developer (USD 99/año) y Google Play (USD 25, pago único). Política de privacidad publicada.

## ⚠️ 6. Seguridad heredada de la v1

- [ ] Los repos viejos **`G041/food-track-backend`** y **`G041/food-track`** siguen expuestos:
  - `.env` con el `JWT_SECRET` real.
  - `prisma/dev.db` con el email y el hash de un usuario.
  - La API key de Google Maps en `app.json`.

  Revocar o rotar la key de Google Maps en Google Cloud, y hacer privados o archivar esos repos (o limpiar su historial).
- [ ] Moderación de links: además de la revisión manual, evaluar una lista de dominios bloqueados o una verificación automática de que el link responda antes de aprobar.
