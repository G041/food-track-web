import { useQuery } from '@tanstack/react-query';

import type { MenuPreview } from '../../../api/menu-preview';

export type { MenuPreview };

// En web es la misma app (/api/...). En nativo o en `expo start` puede apuntar al deploy.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function fetchPreview(url: string): Promise<MenuPreview | null> {
  try {
    const res = await fetch(`${API_URL}/api/menu-preview?url=${encodeURIComponent(url)}`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
    return (await res.json()) as MenuPreview;
  } catch {
    return null; // sin verificador (p. ej. desarrollo local): se intenta mostrar igual
  }
}

/** Verifica del lado del servidor si el menú se puede mostrar dentro de la app. */
export function useMenuPreview(url: string | undefined) {
  return useQuery({
    queryKey: ['menu-preview', url],
    queryFn: () => fetchPreview(url!),
    enabled: !!url,
    staleTime: 60 * 60_000,
  });
}
