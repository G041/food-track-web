import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

const light = {
  bg: '#FFF7EE',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF1E6',
  ink: '#1E1A16',
  inkSoft: '#6B6159',
  inkMuted: '#A39689',
  line: '#EFE3D6',

  primary: '#E4572E',
  primaryDark: '#B83F1C',
  primarySoft: '#FDE3D9',
  accent: '#F4B23E',

  success: '#2F9E6B',
  successSoft: '#DDF3E8',
  warning: '#B57A06',
  warningSoft: '#FFF1CF',
  danger: '#D64545',
  dangerSoft: '#FBE0E0',

  /** Superficies de contraste (pastillas, botón del mapa inactivo). */
  inverseBg: '#1E1A16',
  inverseFg: '#FFFFFF',
  scrim: 'rgba(30, 26, 22, 0.55)',
  mapBg: '#F2EFE9',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#14110F',
  surface: '#1F1B18',
  surfaceAlt: '#2A2420',
  ink: '#F5EEE6',
  inkSoft: '#BDB1A5',
  inkMuted: '#857A70',
  line: '#3A322C',

  primary: '#F0643C',
  primaryDark: '#FF9472',
  primarySoft: '#3D2219',
  accent: '#F4B23E',

  success: '#45C28A',
  successSoft: '#17352A',
  warning: '#E8B04A',
  warningSoft: '#3A2D12',
  danger: '#F27171',
  dangerSoft: '#3E1D1D',

  inverseBg: '#F5EEE6',
  inverseFg: '#1E1A16',
  scrim: 'rgba(0, 0, 0, 0.6)',
  mapBg: '#1B1D22',
};

export const palettes = { light, dark };

// En web los colores son variables CSS: cambiar de tema no requiere re-renderizar ni rehacer estilos.
// En nativo (todavía) se usa la paleta clara; el tema dinámico llega con la app nativa.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('ft-theme')) {
  const vars = (p: Palette) => Object.entries(p).map(([k, v]) => `--c-${k}:${v};`).join('');
  const style = document.createElement('style');
  style.id = 'ft-theme';
  style.textContent = `:root,:root[data-theme="light"]{${vars(light)}color-scheme:light}:root[data-theme="dark"]{${vars(dark)}color-scheme:dark}`;
  document.head.appendChild(style);
}

export const colors: Palette = Object.fromEntries(
  Object.entries(light).map(([k, v]) => [k, Platform.OS === 'web' ? `var(--c-${k})` : v]),
) as Palette;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const font = {
  family: Platform.select({ web: 'var(--font-display)', default: undefined }),
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34 },
} as const;

export const shadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 8px 24px rgba(20, 12, 5, 0.16)' } as ViewStyle,
  default: {
    shadowColor: '#3C230F',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
})!;

/** Alto que ocupa la barra de tabs flotante, para dejar espacio debajo del contenido. */
export const TAB_BAR_SPACE = 112;
export const MAX_CONTENT_WIDTH = 560;
