import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const colors = {
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
} as const;

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
  web: { boxShadow: '0 8px 24px rgba(60, 35, 15, 0.12)' } as ViewStyle,
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
