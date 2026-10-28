import { View } from 'react-native';

import { useStatusBarInset } from '@/hooks/use-header-offset';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

/**
 * Franja detrás de la hora/batería cuando la barra de estado es transparente (app instalada en iOS).
 * En oscuro toma el fondo de la app (todo negro); en claro va en naranja, porque iOS escribe
 * la hora siempre en blanco en este modo y sobre el fondo crema no se leería.
 */
export function StatusBarScrim() {
  const height = useStatusBarInset();
  const theme = useResolvedTheme();
  if (height === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: theme === 'dark' ? colors.bg : colors.primary,
      }}
    />
  );
}
