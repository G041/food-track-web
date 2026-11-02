// Función de Vercel: POST /api/delete-account  (header Authorization: Bearer <access_token>)
// Borra la cuenta del usuario logueado (exigido por Apple: guía 5.1.1(v)). Borrar un usuario de Auth
// requiere la clave secreta, por eso no se hace desde el cliente.
// Lo que se borra: perfil, calificaciones y favoritos (cascada) y sus aportes no publicados.
// Los lugares ya publicados quedan en el mapa sin autor.
import { createClient } from '@supabase/supabase-js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const log = (step: string, detail?: string) => console.log(`[api/delete-account] ${step}${detail ? `: ${detail}` : ''}`);

export async function POST(request: Request) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey || !/^[\x21-\x7e]+$/.test(secretKey)) {
    log('not_configured');
    return json({ error: 'No pudimos borrar la cuenta. Escribinos y lo hacemos a mano.' }, 503);
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Ingresá de nuevo para borrar tu cuenta.' }, 401);

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Valida el token contra Supabase: solo se puede borrar la cuenta propia.
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  const userId = auth?.user?.id;
  if (!userId) {
    log('invalid_token', authError?.message);
    return json({ error: 'Ingresá de nuevo para borrar tu cuenta.' }, 401);
  }

  const { error: pendingError } = await admin
    .from('restaurants')
    .delete()
    .eq('submitted_by', userId)
    .neq('status', 'approved');
  if (pendingError) log('delete_pending_failed', pendingError.message);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    log('delete_user_failed', error.message);
    return json({ error: 'No pudimos borrar la cuenta. Probá de nuevo en un rato.' }, 500);
  }

  log('ok');
  return json({ ok: true });
}
