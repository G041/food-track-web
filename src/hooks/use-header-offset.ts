import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Posiciones de los "HUD" (encabezado y barra de tabs) a partir de las zonas seguras reales del
// dispositivo (env(safe-area-inset-*), expuestas por react-native-safe-area-context).
// La barra de estado es opaca (apple-mobile-web-app-status-bar-style=default), así que el sistema
// ya le reserva su espacio: arriba solo hace falta el inset (notch en horizontal, etc.) + un margen.

export const HEADER_GAP = 12;
export const TAB_BAR_HEIGHT = 68;
const TAB_BAR_GAP = 12;
// El indicador de inicio de iOS ocupa ~34px de zona segura, pero la línea visible está en los
// últimos ~13px: la barra flotante puede apoyarse más abajo sin taparla.
const HOME_INDICATOR_OVERLAP = 20;

/** Distancia desde el borde superior hasta el contenido del encabezado. */
export function useHeaderOffset() {
  const insets = useSafeAreaInsets();
  return insets.top + HEADER_GAP;
}

/** Distancia desde el borde inferior hasta la barra de tabs flotante. */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_GAP + Math.max(0, insets.bottom - HOME_INDICATOR_OVERLAP);
}

/** Espacio que el contenido debe dejar libre abajo para no quedar detrás de la barra de tabs. */
export function useTabBarSpace() {
  return useTabBarBottom() + TAB_BAR_HEIGHT;
}
