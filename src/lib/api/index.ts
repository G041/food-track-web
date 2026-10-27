import { createDemoApi } from './demo-api';
import { createSupabaseApi } from './supabase-api';

export * from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Sin credenciales de Supabase la app corre contra un backend simulado. */
export const isDemo = !url || !key;

export const api = isDemo ? createDemoApi() : createSupabaseApi(url, key);
