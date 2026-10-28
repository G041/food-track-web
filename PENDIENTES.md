# Pendientes de FoodTrack web

Estado al 28/10/2026. **La app está en producción:** https://food-track-web.vercel.app (Vercel), conectada a la base real en Supabase. Funcionan el mapa, la búsqueda, los filtros, el modal de menú, los aportes con moderación, el perfil y el panel de admin.

Lo que sigue está ordenado por prioridad. Cada ítem es una casilla para tachar cuando se resuelve.

---

## 🔴 1. Bloqueantes para usar la app de verdad

- [x] **Base en Supabase** (proyecto `shqlyaqbymsngvakpwyw`, us-east-1): esquema y 28 restaurantes aplicados con `supabase db push --include-seed`. Verificado vía API: anónimo ve 28 aprobados, no puede insertar ni moderar, `restaurants_nearby` responde.
- [x] **Reglas de moderación probadas** contra Postgres + PostGIS local (PGlite): 24 verificaciones en `supabase/tests/db.test.mjs` (`npm run test:db`, corre en la CI). Falta repetirlas una vez contra el proyecto Supabase real.
- [x] **Primer admin:** la cuenta `gianni` es admin (28/10/2026). Para sumar otro: `npx supabase db query --linked "update public.profiles set role='admin' where username='…'"`.
- [x] **Login con nombre de usuario activo en producción:** `SUPABASE_SECRET_KEY` cargada en Vercel (Secret, Production y Preview) el 28/10/2026. Si se rota la clave en Supabase, hay que actualizarla en Vercel y volver a publicar.
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
- [ ] **Probar en iPhone y Android instalada** (Compartir → "Agregar a inicio" / menú → "Instalar app"): zoom, barra de estado, teclado y cámara.
- [ ] **Rate limit del login con usuario:** las llamadas a Supabase salen desde las IPs de Vercel. Con mucho tráfico conviene limitar los intentos por usuario.

## 🟠 2. Funcionalidad que falta

- [ ] **[A DEFINIR] Modo admin para editar la base desde la app:** que los admins puedan crear, editar, despublicar y borrar restaurantes, cambiar categorías, corregir links y ubicaciones, y gestionar usuarios (roles y puntos) sin pasar por el SQL Editor. Se apoya en el ítem "Admin: gestionar lo ya publicado".
- [ ] **[A DEFINIR] Animación de bienvenida** al abrir la app: splash animado con el logo y/o una introducción de 2 o 3 pasos la primera vez.
- [x] **Modal de menú dentro de la app** (`src/components/menu-modal/`): vista previa con estado (Verificando → Cargando → Menú cargado). `api/menu-preview.ts` (función de Vercel) verifica cada link: si se deja embeber, convierte Google Drive a `/preview` y detecta PDF. 17 de 28 menús de la v1 se ven dentro de la app.
- [ ] **Corregir los menús rotos de la v1:** Blossom, El Querandí y Saint Elmo dan 404; Soffice es un Drive privado; Adelmo no resuelve DNS. Hay que pedir los links nuevos o despublicarlos desde el panel de admin.
- [ ] **Menús que bloquean el iframe** (McDonald's, KFC, Starbucks, Garibaldi, Fabric Sushi, Vecino): en web solo se pueden abrir afuera. En la app nativa sí se van a ver dentro (WebView no tiene esa restricción). Opcional: mostrar una captura de la página con un servicio de screenshots.
- [ ] **Recuperar contraseña** (`supabase.auth.resetPasswordForEmail`) y una pantalla para fijar la nueva.
- [ ] **Login con nombre de usuario.** Hoy solo funciona con email, porque Supabase Auth lo requiere. Haría falta una RPC que resuelva username → email sin exponer los emails.
- [ ] **Editar un aporte pendiente.** La base ya lo permite (vuelve a quedar pendiente), pero no hay UI.
- [ ] **Admin: gestionar lo ya publicado.** Falta poder despublicar o borrar restaurantes aprobados, ver el historial de rechazados y editar datos. Hoy el panel solo muestra la cola de pendientes.
- [ ] **Ficha compartible `/restaurant/[id]`** con URL propia (estaba en el plan; hoy la ficha es solo un panel sobre el mapa).
- [ ] **"Cerca mío":** la RPC `restaurants_nearby` existe en la base, pero no se usa.
- [ ] **Encuadre inicial del mapa.** Arranca en el Obelisco con zoom 11.5 y los locales de zona norte (San Isidro, Olivos) quedan fuera de la vista. Convendría ajustar a los marcadores (`fitBounds`) o a la ubicación del usuario.
- [ ] **Escalar la consulta de restaurantes.** `listApproved` trae toda la tabla. Con muchos datos, hay que filtrar por área visible y agrupar pines cercanos (clustering).
- [ ] **Geocodificación:** autocompletar la dirección a partir del pin, o el pin a partir de la dirección.
- [ ] **Ranking de puntos.** Los puntos se suman al aprobar, pero no se muestran en ningún ranking.
- [ ] **Reportar datos incorrectos** de un lugar publicado (link roto, local cerrado).

## 🟡 3. Diseño, UX y marca

- [ ] **Íconos y splash propios.** `assets/images/icon.png`, `favicon.png`, `splash-icon.png`, los íconos de Android y `assets/expo.icon` (iOS) siguen siendo los de la plantilla de Expo. Se puede reutilizar el logo de la v1.
- [ ] **PWA completa:** manifest con íconos de 192/512 px y probar "Agregar a pantalla de inicio".
- [ ] **Layout de escritorio:** lista lateral de resultados junto al mapa (hoy es el diseño mobile estirado).
- [ ] **Estados de carga y error:** skeletons en las listas y un aviso si no cargan los tiles del mapa.
- [ ] **Revisión de accesibilidad:** etiquetas en todos los botones con ícono, contraste y navegación con teclado.
- [ ] La fuente se carga desde Google Fonts con un `@import` en CSS. Evaluar `expo-font` o alojarla en el propio sitio.
- [ ] **Modo oscuro** (opcional; hoy `userInterfaceStyle` está fijo en `light`).

## 👥 Colaboración en equipo

- [ ] **Vercel Hobby no permite invitar miembros** (Pro cuesta USD 20 por usuario por mes; la prueba de 14 días quita a los miembros al terminar). Plan gratuito propuesto:
  - Sumar a los compañeros como colaboradores del repo en GitHub. Con el repo **público**, sus pushes a `main` se publican igual. Si el repo pasa a privado, Vercel Hobby bloquea los deploys de commits de otras personas.
  - Trabajar con pull requests: cada PR genera una URL de preview. Para que se vean sin cuenta de Vercel, desactivar *Settings → Deployment Protection → Vercel Authentication*.
  - Invitar a los compañeros a la organización de Supabase (*Organization → Team*), si el plan Free lo permite.
- [ ] Decidir si el repo queda público (recomendado: no tiene secretos) o pasa a privado.

## 🔵 4. Calidad y mantenimiento

- [ ] **Tests:** no hay. Faltan:
  - Unitarios de `validation.ts` y del filtro del mapa.
  - Tests de RLS en SQL.
  - Un e2e con Playwright en `e2e/` que reproduzca el flujo probado a mano: registro → aporte → aprobación → aparece en el mapa.
- [x] **CI en GitHub Actions en verde** (lint, typecheck y build). La primera ejecución fallaba en `npm ci` por el lockfile desincronizado y la carpeta `public/` faltante; se corrigió en `858bf1f`.
- [ ] **Tipos generados** desde el esquema con `npx supabase gen types typescript` (hoy `src/lib/api/types.ts` está escrito a mano).
- [ ] **Agregar `.gitattributes`** (`* text=auto eol=lf`) para evitar los avisos de LF/CRLF en Windows.
- [ ] **Revisar `npm audit`** (hay avisos en dependencias transitivas).
- [ ] **Keep-alive de Supabase:** el plan Free pausa el proyecto tras 7 días sin actividad. Se resuelve con un cron en GitHub Actions o pasando al plan Pro cuando haya usuarios.
- [ ] **Monitoreo de errores** (Sentry, opcional).

## 🟣 5. Camino a la app nativa

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
