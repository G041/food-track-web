import { createDemoApi } from './demo-api';
import { createSupabaseApi } from './supabase-api';

export * from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const hasBackend = !!url && !!key;

// El modo demo (backend simulado en el navegador) solo se usa en desarrollo
// o si se pide explícitamente con EXPO_PUBLIC_DEMO=true.
const allowDemo = __DEV__ || process.env.EXPO_PUBLIC_DEMO === 'true';

export const isDemo = !hasBackend && allowDemo;

/** Build de producción sin credenciales de Supabase: la app muestra un error en vez de datos falsos. */
export const isMisconfigured = !hasBackend && !allowDemo;

export const api = hasBackend ? createSupabaseApi(url, key) : createDemoApi();
