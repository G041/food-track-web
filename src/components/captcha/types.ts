/**
 * Verificación "sos una persona" (Cloudflare Turnstile) antes de ingresar, crear una cuenta o pedir
 * una contraseña nueva. Frena los pedidos masivos automatizados contra Supabase Auth.
 *
 * Se activa definiendo EXPO_PUBLIC_TURNSTILE_SITE_KEY (la clave pública del sitio). Sin esa variable
 * no se muestra nada y getToken() devuelve undefined: la app funciona igual que antes.
 * Del lado de Supabase hay que activar CAPTCHA con la clave secreta de Turnstile (ver PENDIENTES.md).
 */
export const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export type CaptchaHandle = {
  /** Token de un solo uso para mandar con el pedido. undefined = CAPTCHA no configurado. */
  getToken(): Promise<string | undefined>;
};

/** Tiempo máximo para resolver la verificación (incluye un desafío interactivo). */
export const CAPTCHA_TIMEOUT_MS = 90_000;

export const CAPTCHA_FAILED = 'No pudimos verificar que sos una persona. Probá de nuevo.';
