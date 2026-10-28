import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Margen superior del "header": ~10% del alto de pantalla, y nunca menos que la barra de estado + 12px. */
export function useHeaderOffset() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return Math.max(insets.top + 12, Math.round(height * 0.1));
}
