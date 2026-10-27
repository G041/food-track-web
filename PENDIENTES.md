# Pendientes de FoodTrack web

Estado al 27/10/2026. Lo que **ya funciona**: la app web en modo demo, con mapa, búsqueda, filtros, aportes con moderación, perfil y panel de admin. El flujo completo se probó en Chrome simulando un celular.

Lo que sigue está ordenado por prioridad. Cada ítem es una casilla para tachar cuando se resuelve.

---

## 🔴 1. Bloqueantes para usar la app de verdad

- [ ] **Crear el proyecto Supabase y ejecutar el SQL.** Primero `supabase/migrations/20261027000000_init.sql` y después `supabase/seed.sql`. ⚠️ **El SQL nunca se ejecutó contra un Postgres real** (no había Docker para levantar Supabase local), así que puede necesitar ajustes. Los puntos más delicados:
  - La columna generada `location` (PostGIS `geography`) calculada desde lat/lng.
  - Los triggers `security definer` que usan `auth.uid()`.
  - El `disable trigger` del seed.
- [ ] **Probar las reglas de moderación en la base real:**
  - Un anónimo no puede insertar.
  - Un usuario no puede aprobar su propio aporte, ni con un `update` directo.
  - Un usuario no ve los pendientes de otros.
  - El admin puede aprobar y rechazar con `review_restaurant`.
  - Al pasar 10 aportes en 24 h, se rechaza el siguiente.
  - Un `menu_url` repetido se rechaza.
- [ ] **Configurar `.env`** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`) y nombrar el primer admin con `update public.profiles set role='admin' where username='…';`.
- [ ] **Evitar el modo demo en producción por accidente.** Hoy, si faltan las variables de entorno, la app pasa sola a modo demo. En el deploy convendría que falle la build o que se muestre un error visible.
- [ ] **Deploy en Vercel.** Importar el repo y cargar las variables de entorno. En Supabase, configurar *Authentication → URL Configuration* (Site URL y Redirect URLs con el dominio de Vercel) para que los emails de confirmación lleven a la app.
- [ ] **Escaneo de QR en celulares reales** (Chrome Android y Safari iOS) sobre HTTPS. Si `onBarcodeScanned` de `expo-camera` no detecta bien en web, hay que implementar un fallback con `@zxing/browser` en un `qr-scanner.web.tsx`.

## 🟠 2. Funcionalidad que falta

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

## 🔵 4. Calidad y mantenimiento

- [ ] **Tests:** no hay. Faltan:
  - Unitarios de `validation.ts` y del filtro del mapa.
  - Tests de RLS en SQL.
  - Un e2e con Playwright en `e2e/` que reproduzca el flujo probado a mano: registro → aporte → aprobación → aparece en el mapa.
- [ ] **Verificar que la CI pase en GitHub Actions.** La primera ejecución falló en `npm ci`: el `package-lock.json` estaba desincronizado y el `postinstall` fallaba en una copia limpia porque `public/` no existía. Ya está corregido; falta confirmar el primer run en verde.
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
