// Función de Vercel: GET /api/menu-preview?url=<menu_url>
// Verifica si el menú se puede mostrar dentro de la app (iframe) y devuelve la URL a embeber.
// Muchos sitios lo prohíben con X-Frame-Options o CSP frame-ancestors; eso solo se ve desde el servidor.
/// <reference types="node" />
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import type { Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

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

// ─────────────────────────────────────────────────────────────
// Protección contra SSRF: la función solo puede hablar con hosts públicos.
// El chequeo se hace sobre la IP a la que realmente se conecta (no sobre el nombre) y en cada salto
// de una redirección, para que ni un DNS que apunta a una red privada ni un 302 lo esquiven.
// ─────────────────────────────────────────────────────────────
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
const MAX_REDIRECTS = 5;

function isPublicIPv4(ip: string) {
  const [a, b, c] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false; // "esta red", privada, loopback, multicast y reservadas
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local (metadatos de nubes)
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function isPublicAddress(address: string) {
  const ip = address.toLowerCase();
  const family = isIP(ip);
  if (family === 4) return isPublicIPv4(ip);
  if (family !== 6) return false;
  // Solo direcciones globales (2000::/3). Quedan afuera loopback, link-local, ULA, IPv4 mapeadas, NAT64, etc.
  if (!/^[23][0-9a-f]{0,3}:/.test(ip)) return false;
  // Documentación, Teredo y 6to4 (estas dos últimas llevan una IPv4 adentro).
  return !/^2001:0?db8:/.test(ip) && !/^2001:0{0,4}:/.test(ip) && !/^2002:/.test(ip);
}

/** URL http(s), en un puerto web y sin apuntar por IP literal a una red privada. */
function isAllowedUrl(url: URL) {
  if (!/^https?:$/.test(url.protocol) || !ALLOWED_PORTS.has(url.port) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return false;
  }
  return isIP(host) ? isPublicAddress(host) : true;
}

// Resolución DNS que usa la conexión: si alguna IP del nombre no es pública, la conexión no se abre.
type LookupCallback = (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void;
function safeLookup(hostname: string, options: { all?: boolean } | LookupCallback, callback?: LookupCallback) {
  const cb = (typeof options === 'function' ? options : callback) as LookupCallback;
  const all = typeof options === 'object' && options.all === true;
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return cb(err);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return cb(Object.assign(new Error(`Dirección no pública: ${hostname}`), { code: 'EBLOCKED' }));
    }
    if (all) cb(null, addresses);
    else cb(null, addresses[0].address, addresses[0].family);
  });
}

function request(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method: 'GET',
        headers: { 'user-agent': UA, accept: 'text/html,application/pdf,*/*', 'accept-encoding': 'identity' },
        lookup: safeLookup as never,
        signal,
      },
      resolve,
    );
    req.on('error', reject);
    req.end();
  });
}

type Fetched = { url: URL; status: number; headers: Headers; body: IncomingMessage };

/** GET siguiendo redirecciones a mano y validando cada salto. Lanza si algún destino no está permitido. */
async function safeFetch(start: URL, signal: AbortSignal): Promise<Fetched> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedUrl(url)) throw new Error('Destino no permitido');
    const res = await request(url, signal);
    const status = res.statusCode ?? 0;
    const location = res.headers.location;
    if (status >= 300 && status < 400 && location) {
      res.destroy();
      url = new URL(location, url);
      continue;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(res.headers)) {
      if (value != null) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    return { url, status, headers, body: res };
  }
  throw new Error('Demasiadas redirecciones');
}

// Freno básico por IP. Vive en la memoria de cada instancia: no es un límite global, pero corta el
// abuso más burdo; además las respuestas quedan cacheadas en el CDN por URL.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(request: Request) {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const now = Date.now();
  if (hits.size > 5000) for (const [key, hit] of hits) if (hit.reset < now) hits.delete(key);
  const hit = hits.get(ip);
  if (!hit || hit.reset < now) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  return ++hit.count > RATE_LIMIT;
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

async function readTitle(res: Fetched) {
  try {
    const encoding = res.headers.get('content-encoding') ?? '';
    const stream: Readable = /gzip/i.test(encoding)
      ? res.body.pipe(createGunzip())
      : /br/i.test(encoding)
        ? res.body.pipe(createBrotliDecompress())
        : /deflate/i.test(encoding)
          ? res.body.pipe(createInflate())
          : res.body;
    stream.on('error', () => {});
    const decoder = new TextDecoder();
    let html = '';
    for await (const chunk of stream) {
      html += decoder.decode(chunk as Uint8Array, { stream: true });
      if (html.length >= 60_000 || /<\/title>/i.test(html)) break;
    }
    const m = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
    return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : null;
  } catch {
    return null;
  } finally {
    res.body.destroy();
  }
}

export async function GET(request: Request) {
  if (rateLimited(request)) {
    return new Response(JSON.stringify({ error: 'Demasiadas consultas. Esperá un minuto.' }), {
      status: 429,
      headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
    });
  }

  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return json(empty('invalid'), 3600);
  }
  if (raw.length > 2000 || !isAllowedUrl(url)) return json(empty('invalid'), 3600);

  const target = new URL(driveEmbedUrl(url) ?? url.toString());

  let res: Fetched;
  try {
    res = await safeFetch(target, AbortSignal.timeout(8000));
  } catch {
    return json(empty('unreachable'), 600);
  }

  const finalUrl = res.url.toString();
  const contentType = res.headers.get('content-type') ?? '';
  const kind: MenuPreview['kind'] = contentType.includes('pdf') || /\.pdf$/i.test(res.url.pathname) ? 'pdf' : 'html';
  const base = { kind, finalUrl, httpStatus: res.status };

  if (res.status < 200 || res.status >= 300) {
    res.body.destroy();
    const isDrive = /(^|\.)google\.com$/.test(res.url.hostname);
    const antiBot = [401, 403, 429].includes(res.status) && !isDrive; // Drive 401/403 = archivo privado
    if (antiBot && !blocksFraming(res.headers)) return json(empty('unverified', { ...base, embedUrl: finalUrl }), 3600);
    return json(empty(antiBot ? 'blocked' : 'broken', base), 3600);
  }

  const title = kind === 'html' ? await readTitle(res) : null;
  if (kind === 'pdf') res.body.destroy();
  if (blocksFraming(res.headers)) return json(empty('blocked', { ...base, title }));
  return json({ status: 'embeddable', embedUrl: finalUrl, title, ...base });
}
