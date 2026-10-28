# FoodTrack (web)

Mapa colaborativo de menús QR. Cualquiera encuentra lugares para comer en el mapa y abre su menú. Los usuarios registrados suman lugares escaneando el QR del menú (o pegando el link). **Cada aporte pasa por moderación** antes de publicarse.

Es la v2 de [food-track](https://github.com/G041/food-track) + [food-track-backend](https://github.com/G041/food-track-backend). Está hecha con **Expo + React Native + Expo Router**: hoy se publica como app web, y el mismo código va a generar la app nativa más adelante.

## Stack

| | |
|---|---|
| App | Expo SDK 58, React Native 0.88 + react-native-web, Expo Router, TypeScript |
| Datos | TanStack Query (servidor) + Zustand (filtros del mapa) |
| Mapa (web) | MapLibre GL JS vía `react-map-gl/maplibre`, tiles de OpenFreeMap (sin API key) |
| QR | `expo-camera` (`onBarcodeScanned`; en web requiere HTTPS) |
| Backend | Supabase: Postgres + PostGIS, Auth, Row Level Security, funciones RPC |
| Hosting | Vercel (web estática), Supabase Cloud (BD) |

## Pantallas

- **Mapa** (botón central, pantalla principal): pines por categoría, búsqueda sin acentos, filtro por categoría, ficha con "Ver menú" y "Cómo llegar".
- **App instalable**: desde el navegador del celular, "Agregar a pantalla de inicio". Abre sin la interfaz del navegador, sin zoom ni selección de texto, con tema claro u oscuro.
- **Modal de menú**: el menú se abre dentro de la app con un indicador de estado. `api/menu-preview.ts` (función de Vercel) verifica antes si el sitio permite mostrarse en un iframe, si el link está roto o si es PDF o Google Drive. Si el sitio lo prohíbe, el modal lo explica y ofrece abrirlo afuera.
- **Aportar**: escanear el QR o pegar el link → nombre, categoría, dirección y ubicación en el mapa (por defecto, tu GPS) → *Enviar a revisión*.
- **Perfil**: ingreso o registro, puntos, "Mis aportes" con su estado (En revisión / Publicado / Rechazado + motivo) y opción de retirar los pendientes.
- **Moderación** (`/admin`, solo admins): cola de aportes pendientes con el link y un mapa de control, para aprobar o rechazar con motivo.

## Moderación: cómo está garantizada

Las reglas viven en la base (`supabase/migrations/20261027000000_init.sql`), no solo en la UI:

1. Un trigger `before insert` **fuerza `status = 'pending'`** y `submitted_by = auth.uid()`, sin importar lo que mande el cliente. Los aportes de un admin se publican directo.
2. Las políticas RLS hacen que el público vea solo los `approved`. Cada usuario ve además sus propios aportes, y el admin ve todo.
3. Solo la función `review_restaurant()` (que valida `is_admin()`) cambia el estado. Si se aprueba, suma 10 puntos a quien aportó.
4. Si un usuario edita su aporte, vuelve a quedar pendiente. Solo puede editar o borrar mientras siga pendiente.
5. Anti-spam: máximo 10 aportes por usuario cada 24 h, y un índice único sobre `menu_url` para que no se cargue dos veces el mismo menú.

## Correr en local

```bash
npm install          # también copia el worker de MapLibre a public/
npx expo start --web # http://localhost:8081
```

Sin archivo `.env` la app arranca en **modo demo**: usa un backend simulado en el navegador (localStorage) con los 28 restaurantes de la v1. Para probar la moderación, entrá con `admin@foodtrack.demo` / `admin1234`.

Otros comandos: `npm run lint`, `npm run typecheck`, `npm run test:db` (prueba el SQL en un Postgres local), `npm run build:web` (genera `dist/`).

> **Al agregar dependencias desde Windows:** npm a veces saca del `package-lock.json` dependencias opcionales que Linux necesita (`@emnapi/*`), y la CI falla en `npm ci`. Verificalo antes de subir con `npm run check:lock`. Si falla, regenerá el lockfile completo: `rm -rf node_modules package-lock.json && npm install`.

## Producción

| | |
|---|---|
| Web | https://food-track-web.vercel.app |
| Hosting | Vercel, proyecto `food-track2/food-track-web` (plan Hobby). Publica solo en cada push a `main`; los PR generan previews |
| Base de datos | Supabase, proyecto `shqlyaqbymsngvakpwyw` (us-east-1, plan Free) |
| Variables en Vercel | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (públicas) y `SUPABASE_SECRET_KEY` (sensible, solo la usa `api/login`), en Production y Preview |
| Auth | Site URL y Redirect URL apuntando a la web de Vercel |

**Cambios en la base:** crear una migración nueva en `supabase/migrations/` (`npx supabase migration new <nombre>`), probarla con `npm run test:db` y aplicarla con:

```bash
npx supabase login                                   # una vez, en una terminal propia
npx supabase link --project-ref shqlyaqbymsngvakpwyw
npx supabase db push --linked
```

**Deploy manual** (si hiciera falta): `vercel deploy --prod`, con la CLI de Vercel logueada en la cuenta dueña del proyecto.

## Conectar Supabase en otro proyecto (desde cero)

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan Free, región São Paulo).
2. En **SQL Editor**, ejecutá en orden:
   - `supabase/migrations/20261027000000_init.sql` (esquema, triggers, RLS, funciones)
   - `supabase/seed.sql` (los 28 restaurantes de la v1, ya aprobados)

   Si preferís la CLI: `npx supabase link --project-ref <ref>` y después `npx supabase db push`.
3. Copiá `.env.example` como `.env` con la URL y la key pública (*Project Settings → API*).
4. Registrate desde la app y hacete admin en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where username = 'TU_USUARIO';
   ```
5. Para desarrollo podés desactivar la confirmación por email en *Authentication → Providers → Email*.

> El plan Free pausa el proyecto tras 7 días sin actividad. Se reactiva desde el dashboard.

## Deploy (Vercel)

Importá el repo en Vercel: `vercel.json` ya define el build (`npm run build:web`), la carpeta de salida (`dist`) y el rewrite SPA. Cargá `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` como variables de entorno del proyecto.

## Estructura

```
src/
  app/                      rutas (Expo Router)
    (tabs)/                 aportar · index (mapa) · perfil
    admin.tsx               moderación
  components/
    app-tabs.tsx            barra flotante con el mapa al centro
    restaurant-map/         interfaz común + index.web.tsx (MapLibre) + index.tsx (nativo, pendiente)
    qr-scanner.tsx, ui.tsx
  features/                 auth, restaurants (queries + validación), map (filtros)
  lib/api/                  interfaz Api + implementación Supabase + implementación demo
  theme/tokens.ts           colores, espaciados, radios
supabase/                   migraciones SQL y seed
```

## Próximos pasos

- Probar el escaneo de QR en celulares reales (Chrome Android, Safari iOS) sobre HTTPS.
- Implementar `restaurant-map/index.tsx` con `@maplibre/maplibre-react-native` para la app nativa.
- "Cerca mío" usando la RPC `restaurants_nearby` (ya creada).
