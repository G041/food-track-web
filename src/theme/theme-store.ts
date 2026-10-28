import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { create } from 'zustand';

import { palettes } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

// Misma clave que el script de public/index.html, que aplica el tema antes del primer render.
const STORAGE_KEY = 'foodtrack-theme';

function readPreference(): ThemePreference {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

type ThemeState = { preference: ThemePreference; setPreference: (p: ThemePreference) => void };

export const useThemePreference = create<ThemeState>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, preference);
    } catch {}
    set({ preference });
  },
}));

export function useResolvedTheme(): ResolvedTheme {
  const preference = useThemePreference((s) => s.preference);
  const system = useColorScheme();
  if (Platform.OS !== 'web') return 'light'; // tema dinámico en nativo: pendiente
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
}

/** Sincroniza el tema resuelto con el documento (variables CSS y color de la barra del sistema). */
export function useApplyTheme() {
  const theme = useResolvedTheme();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palettes[theme].bg);
    // iOS lee este estilo al abrir la app: un cambio de tema se ve en la barra de estado al reabrirla.
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute('content', theme === 'dark' ? 'black' : 'default');
  }, [theme]);
  return theme;
}
