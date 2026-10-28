// Función de Vercel: POST /api/login { username, password }
// Permite ingresar con nombre de usuario. Supabase Auth solo acepta email, así que el servidor
// busca el email con la clave secreta y hace el login acá: el email nunca llega al cliente.
import { createClient } from '@supabase/supabase-js';

const USERNAME = /^[A-Za-z0-9_.]{4,15}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Mismo mensaje si el usuario no existe o la contraseña es incorrecta (no revelar qué usuarios existen).
const WRONG = { error: 'Usuario o contraseña incorrectos.' };

export async function POST(request: Request) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey) return json({ error: 'El login con usuario no está configurado.' }, 503);

  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!USERNAME.test(username) || !password) return json(WRONG, 401);

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, secretKey, options);

  // ilike para ignorar mayúsculas; se escapan "_" y "%" porque son comodines de LIKE.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username.replace(/[_%\\]/g, '\\$&'))
    .maybeSingle();
  if (!profile) return json(WRONG, 401);

  const { data: user } = await admin.auth.admin.getUserById(profile.id);
  const email = user?.user?.email;
  if (!email) return json(WRONG, 401);

  const { data, error } = await createClient(url, publicKey, options).auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    if (error && /email not confirmed/i.test(error.message)) {
      return json({ error: 'Confirmá tu email antes de ingresar.' }, 401);
    }
    if (error && /rate limit/i.test(error.message)) {
      return json({ error: 'Demasiados intentos. Esperá unos minutos.' }, 429);
    }
    return json(WRONG, 401);
  }

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
