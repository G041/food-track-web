// Función de Vercel: GET /api/menu-preview?url=<menu_url>
// Verifica si el menú se puede mostrar dentro de la app (iframe) y devuelve la URL a embeber.
// Muchos sitios lo prohíben con X-Frame-Options o CSP frame-ancestors; eso solo se ve desde el servidor.

export type MenuPreview = {
  /** unverified: el sitio rechaza al servidor (anti-bots), pero puede andar en el navegador. */
  status: 'embeddable' | 'blocked' | 'broken' | 'unverified' | 'unreachable' | 'invalid';
  kind: 'html' | 'pdf';
  /** URL a cargar en el iframe (puede diferir del link original, p. ej. Google Drive → /preview). */
  embedUrl: string | null;
  finalUrl: string | null;
  httpStatus: number | null;
  title: string | null;
};

const UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

const json = (body: MenuPreview, maxAge = 86400) =>
  new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=604800`,
    },
  });

const empty = (status: MenuPreview['status'], extra: Partial<MenuPreview> = {}): MenuPreview => ({
  status,
  kind: 'html',
  embedUrl: null,
  finalUrl: null,
  httpStatus: null,
  title: null,
  ...extra,
});

// Evita usar la función para sondear redes internas.
function isPublicHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  return !h.includes(':'); // sin IPv6 literales
}

/** Links de Google Drive → su versión embebible. */
function driveEmbedUrl(url: URL): string | null {
  if (url.hostname !== 'drive.google.com' && url.hostname !== 'docs.google.com') return null;
  const file = url.pathname.match(/\/(?:file\/)?d\/([\w-]+)/);
  if (file) {
    const base = url.hostname === 'docs.google.com' ? url.pathname.split('/d/')[0] : '/file';
    return `https://${url.hostname}${base}/d/${file[1]}/preview`;
  }
  const folder = url.pathname.match(/\/folders\/([\w-]+)/);
  if (folder) return `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`;
  return null;
}

function blocksFraming(headers: Headers) {
  if (headers.get('x-frame-options')) return true;
  const ancestors = (headers.get('content-security-policy') ?? '').match(/frame-ancestors([^;]*)/i);
  return !!ancestors && !/\*/.test(ancestors[1]);
}

function decodeEntities(s: string) {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return s.replace(/&(#x?[\da-f]+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(e[1] === 'x' ? 2 : 1), e[1] === 'x' ? 16 : 10)) : (named[e.toLowerCase()] ?? m),
  );
}

async function readTitle(res: Response) {
  try {
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = '';
    while (html.length < 60_000) {
      const { value, done } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (/<\/title>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    const m = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
    return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return json(empty('invalid'), 3600);
  }
  if (!/^https?:$/.test(url.protocol) || !isPublicHost(url.hostname)) return json(empty('invalid'), 3600);

  const target = driveEmbedUrl(url) ?? url.toString();

  let res: Response;
  try {
    res = await fetch(target, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/pdf,*/*' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return json(empty('unreachable'), 600);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const kind: MenuPreview['kind'] = contentType.includes('pdf') || /\.pdf$/i.test(new URL(res.url).pathname) ? 'pdf' : 'html';
  const base = { kind, finalUrl: res.url, httpStatus: res.status };

  if (!res.ok) {
    res.body?.cancel().catch(() => {});
    const isDrive = /(^|\.)google\.com$/.test(new URL(res.url).hostname);
    const antiBot = [401, 403, 429].includes(res.status) && !isDrive; // Drive 401/403 = archivo privado
    if (antiBot && !blocksFraming(res.headers)) return json(empty('unverified', { ...base, embedUrl: res.url }), 3600);
    return json(empty(antiBot ? 'blocked' : 'broken', base), 3600);
  }
  if (blocksFraming(res.headers)) {
    const title = kind === 'html' ? await readTitle(res) : null;
    return json(empty('blocked', { ...base, title }));
  }

  const title = kind === 'html' ? await readTitle(res) : null;
  if (kind === 'pdf') res.body?.cancel().catch(() => {});
  return json({ status: 'embeddable', embedUrl: res.url, title, ...base });
}
