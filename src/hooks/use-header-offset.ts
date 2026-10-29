import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Posiciones de los "HUD" (encabezado y barra de tabs) a partir de las zonas seguras reales del
// dispositivo (env(safe-area-inset-*), expuestas por react-native-safe-area-context).
//
// En iOS, la app instalada usa la barra de estado "black-translucent": la página se dibuja por
// debajo de la hora, así en tema oscuro todo queda negro. iOS reciente a veces informa
// env(safe-area-inset-top) = 0 en ese modo, así que se estima el alto según el tamaño de pantalla.

export const HEADER_GAP = 12;
// Separación adicional para que los encabezados queden debajo del difuminado de iOS instalada.
const IOS_SCROLL_EDGE_CLEARANCE = 16;
export const TAB_BAR_HEIGHT = 68;
const TAB_BAR_GAP = 12;
// El indicador de inicio de iOS ocupa ~34px de zona segura, pero la línea visible está en los
// últimos ~13px: la barra flotante puede apoyarse más abajo sin taparla.
const HOME_INDICATOR_OVERLAP = 20;

/** true si corre como app instalada en la pantalla de inicio de un iPhone/iPad. */
export function isIosStandalone() {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true;
}

/** Alto estimado de la barra de estado del iPhone en vertical (puntos CSS). */
function estimatedIosStatusBar() {
  const h = Math.max(screen.width, screen.height);
  if (h >= 852) return 59; // Dynamic Island (14 Pro en adelante, 15, 16, 17)
  if (h >= 812) return 48; // notch (X a 14)
  return 20; // SE y anteriores
}

/** Alto de la zona de la barra de estado que el contenido no debe tapar. */
export function useStatusBarInset() {
  const insets = useSafeAreaInsets();
  if (insets.top > 0 || !isIosStandalone()) return insets.top;
  return estimatedIosStatusBar();
}

/** Distancia desde el borde superior hasta el contenido del encabezado. */
export function useHeaderOffset() {
  return useStatusBarInset() + HEADER_GAP + (isIosStandalone() ? IOS_SCROLL_EDGE_CLEARANCE : 0);
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
