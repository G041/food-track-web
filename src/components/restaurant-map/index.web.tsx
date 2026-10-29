import 'maplibre-gl/dist/maplibre-gl.css';

import Ionicons from '@expo/vector-icons/Ionicons';
import { setWorkerUrl } from 'maplibre-gl';
import { useCallback, useEffect, useRef } from 'react';
import { Map, Marker, type MapRef } from 'react-map-gl/maplibre';
import { StyleSheet, View } from 'react-native';

import { categoryMeta } from '@/lib/categories';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

import { MAP_STYLE_URLS, type RestaurantMapProps } from './types';

export type { MapMarker, RestaurantMapProps } from './types';

// Metro no empaqueta el worker de MapLibre: se copia a public/ en postinstall.
setWorkerUrl('/maplibre-gl-worker.mjs');

const SELECTED_PIN_SIZE = 44;
const PIN_TIP_HEIGHT = 8;
// The geographic anchor is the tip; visually center the circular marker above it.
const SELECTED_PIN_CENTER_OFFSET = SELECTED_PIN_SIZE / 2 + PIN_TIP_HEIGHT - 1;

export default function RestaurantMap({
  markers = [],
  selectedId,
  onMarkerPress,
  onMapPress,
  userLocation,
  focus,
  previewFocus,
  focusCenterY,
  initialCenter,
  initialZoom = 12,
  pickedPoint,
  onPick,
}: RestaurantMapProps) {
  const mapRef = useRef<MapRef>(null);
  const theme = useResolvedTheme();

  const focusMap = useCallback((target: NonNullable<RestaurantMapProps['focus']>, centerRestaurantPin = false) => {
    const map = mapRef.current;
    if (!map) return;
    const offsetY = focusCenterY == null ? 0 : focusCenterY - map.getCanvas().clientHeight / 2
      + (centerRestaurantPin ? SELECTED_PIN_CENTER_OFFSET : 0);
    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: target.zoom ?? Math.max(map.getZoom(), 14),
      duration: 700,
      offset: [0, offsetY],
    });
  }, [focusCenterY]);

  useEffect(() => {
    if (focus) focusMap(focus);
  }, [focus, focusMap]);

  useEffect(() => {
    if (previewFocus) focusMap(previewFocus, true);
  }, [previewFocus, focusMap]);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        initialViewState={{ ...initialCenter, zoom: initialZoom }}
        onLoad={() => {
          const target = previewFocus ?? focus;
          if (target) focusMap(target, !!previewFocus);
        }}
        mapStyle={MAP_STYLE_URLS[theme]}
        attributionControl={{ compact: true }}
        style={{ position: 'absolute', inset: 0 }}
        cursor={onPick ? 'crosshair' : 'grab'}
        onClick={(e) => {
          const coords = { latitude: e.lngLat.lat, longitude: e.lngLat.lng };
          onPick?.(coords);
          onMapPress?.(coords);
        }}>
        {userLocation && (
          <Marker {...userLocation} anchor="center">
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Marker>
        )}

        {markers.map((m) => {
          const meta = categoryMeta(m.category);
          const selected = m.id === selectedId;
          return (
            <Marker
              key={m.id}
              latitude={m.latitude}
              longitude={m.longitude}
              anchor="bottom"
              style={{ zIndex: selected ? 2 : 1, cursor: 'pointer' }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onMarkerPress?.(m.id);
              }}>
              <View accessibilityLabel={m.label} style={styles.pinWrap}>
                <View style={[styles.pin, { backgroundColor: meta.color }, selected && styles.pinSelected]}>
                  <Ionicons name={meta.icon} size={selected ? 20 : 15} color="#fff" />
                </View>
                <View style={[styles.pinTip, { borderTopColor: meta.color }]} />
              </View>
            </Marker>
          );
        })}

        {pickedPoint && (
          <Marker
            {...pickedPoint}
            anchor="bottom"
            draggable
            onDragEnd={(e) => onPick?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })}>
            <Ionicons name="location" size={44} color={colors.primary} />
          </Marker>
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: colors.mapBg },
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinSelected: { width: SELECTED_PIN_SIZE, height: SELECTED_PIN_SIZE, borderRadius: SELECTED_PIN_SIZE / 2, borderWidth: 3 },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: PIN_TIP_HEIGHT,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  userHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 117, 252, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2575FC',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
