// Función de Vercel: POST /api/login { username, password }
// Permite ingresar con nombre de usuario. Supabase Auth solo acepta email, así que el servidor
// busca el email con la clave secreta y hace el login acá: el email nunca llega al cliente.
import { createClient } from '@supabase/supabase-js';

const USERNAME = /^[A-Za-z0-9_.]{4,15}$/;

// Intentos fallidos permitidos en la ventana, por nombre de usuario y por IP de origen.
const WINDOW_MS = 15 * 60_000;
const MAX_PER_USERNAME = 10;
const MAX_PER_IP = 30;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Mismo mensaje si el usuario no existe o la contraseña es incorrecta (no revelar qué usuarios existen).
const WRONG = { error: 'Usuario o contraseña incorrectos.' };

// Log interno (Vercel → Logs) para diagnosticar en qué paso falla, sin datos sensibles.
const log = (step: string, detail?: string) => console.log(`[api/login] ${step}${detail ? `: ${detail}` : ''}`);

export async function POST(request: Request) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !publicKey || !secretKey) return json({ error: 'El login con usuario no está configurado.' }, 503);
  // Una clave copiada enmascarada ("sb_secret_abc•••") o con caracteres invisibles rompe los headers HTTP.
  if (!/^[\x21-\x7e]+$/.test(secretKey)) {
    log('secret_key_invalid', 'SUPABASE_SECRET_KEY tiene caracteres no ASCII: volver a copiarla desde Supabase (revelada)');
    return json({ error: 'El login con usuario no está bien configurado. Por ahora ingresá con tu email.' }, 503);
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: unknown; password?: unknown; captchaToken?: unknown }
    | null;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  // Tope de tamaño: nadie tiene una contraseña de más de 200 caracteres ni un token de más de 4 KB.
  const password = typeof body?.password === 'string' && body.password.length <= 200 ? body.password : '';
  const captchaToken =
    typeof body?.captchaToken === 'string' && body.captchaToken.length <= 4096 ? body.captchaToken : undefined;
  if (!USERNAME.test(username) || !password) return json(WRONG, 401);

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, secretKey, options);

  // Límite de intentos fallidos por usuario y por IP (tabla login_attempts, solo accesible con la clave
  // secreta). Supabase ve todos estos logins saliendo de las IPs de Vercel, así que su propio límite por
  // IP no distingue a un atacante del resto. Si la tabla todavía no existe, se sigue sin límite.
  const key = username.toLowerCase();
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const countRecent = async (column: 'username' | 'ip', value: string) => {
    const { count, error } = await admin
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq(column, value)
      .gte('created_at', since);
    if (error) log('rate_limit_unavailable', error.message);
    return count ?? 0;
  };
  const [byUser, byIp] = await Promise.all([countRecent('username', key), ip ? countRecent('ip', ip) : 0]);
  if (byUser >= MAX_PER_USERNAME || byIp >= MAX_PER_IP) {
    log('rate_limited', byUser >= MAX_PER_USERNAME ? 'username' : 'ip');
    return json({ error: 'Demasiados intentos. Esperá unos minutos o ingresá con tu email.' }, 429);
  }
  const failed = async () => {
    const { error } = await admin.from('login_attempts').insert({ username: key, ip });
    if (error) log('rate_limit_unavailable', error.message);
    // Limpieza oportunista: no hace falta guardar intentos viejos.
    if (Math.random() < 0.05) {
      await admin.from('login_attempts').delete().lt('created_at', new Date(Date.now() - 24 * 3600_000).toISOString());
    }
    return json(WRONG, 401);
  };

  // ilike para ignorar mayúsculas; se escapan "_" y "%" porque son comodines de LIKE.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username.replace(/[_%\\]/g, '\\$&'))
    .maybeSingle();
  if (profileError) log('profile_lookup_error', profileError.message);
  if (!profile) {
    log('profile_not_found');
    return failed();
  }

  const { data: user, error: userError } = await admin.auth.admin.getUserById(profile.id);
  const email = user?.user?.email;
  if (!email) {
    log('get_user_failed', userError?.message);
    return failed();
  }

  // Con CAPTCHA activado en Supabase, el login necesita el token que resolvió el cliente.
  const { data, error } = await createClient(url, publicKey, options).auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error || !data.session) {
    log('sign_in_failed', error?.message);
    if (error && /captcha/i.test(error.message)) {
      // Igual cuenta como intento: sin eso, pedidos sin token podrían repetirse sin límite.
      await failed();
      return json({ error: 'No pudimos verificar que sos una persona. Probá de nuevo.' }, 400);
    }
    if (error && /email not confirmed/i.test(error.message)) {
      return json({ error: 'Confirmá tu email antes de ingresar.' }, 401);
    }
    if (error && /rate limit/i.test(error.message)) {
      return json({ error: 'Demasiados intentos. Esperá unos minutos.' }, 429);
    }
    return failed();
  }

  log('ok');
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
