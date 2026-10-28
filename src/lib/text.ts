/** Minúsculas y sin acentos, para comparar búsquedas. */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Formato estándar para mostrar un usuario: "@Gianni" (no cambia cómo se guarda ni cómo se ingresa). */
export function displayUsername(username: string | null | undefined) {
  if (!username) return 'anónimo';
  return `@${username.charAt(0).toUpperCase()}${username.slice(1)}`;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}
