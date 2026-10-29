import type { CategorySlug } from '@/lib/api';
import type { LatLng } from '@/hooks/use-user-location';

export type MapMarker = LatLng & { id: number; category: CategorySlug; label: string };

/** Interfaz común de las implementaciones web (MapLibre GL JS) y nativa. */
export type RestaurantMapProps = {
  markers?: MapMarker[];
  selectedId?: number | null;
  onMarkerPress?: (id: number) => void;
  /** Toque en el mapa fuera de un marcador. */
  onMapPress?: (coords: LatLng) => void;
  userLocation?: LatLng | null;
  /** Cada vez que cambia, el mapa vuela a ese punto. */
  focus?: (LatLng & { zoom?: number }) | null;
  /** Current compact card; changes move the map without blocking manual location controls. */
  previewFocus?: (LatLng & { zoom?: number }) | null;
  /** Vertical center of the map area between the search bar and sheet, in container pixels. */
  focusCenterY?: number;
  initialCenter: LatLng;
  initialZoom?: number;
  /** Modo "elegir ubicación": muestra un pin arrastrable. */
  pickedPoint?: LatLng | null;
  onPick?: (coords: LatLng) => void;
};

// Estilos de OpenFreeMap (gratis, sin API key), según el tema.
export const MAP_STYLE_URLS = {
  light: process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron',
  dark: process.env.EXPO_PUBLIC_MAP_STYLE_URL_DARK ?? 'https://tiles.openfreemap.org/styles/dark',
};
