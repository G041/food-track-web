import { View } from 'react-native';

import { useStatusBarInset } from '@/hooks/use-header-offset';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

/**
 * Franja detrás de la hora/batería cuando la barra de estado es transparente (app instalada en iOS).
 * En oscuro no se dibuja nada: el contenido (mapa, fondo) pasa por detrás de la hora, que iOS
 * escribe en blanco. En claro va en naranja, porque la hora blanca no se leería sobre el crema.
 */
export function StatusBarScrim() {
  const height = useStatusBarInset();
  const theme = useResolvedTheme();
  if (height === 0 || theme === 'dark') return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height, backgroundColor: colors.primary }}
    />
  );
}
