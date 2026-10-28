import 'maplibre-gl/dist/maplibre-gl.css';

import Ionicons from '@expo/vector-icons/Ionicons';
import { setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { Map, Marker, type MapRef } from 'react-map-gl/maplibre';
import { StyleSheet, View } from 'react-native';

import { categoryMeta } from '@/lib/categories';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

import { MAP_STYLE_URLS, type RestaurantMapProps } from './types';

export type { MapMarker, RestaurantMapProps } from './types';

// Metro no empaqueta el worker de MapLibre: se copia a public/ en postinstall.
setWorkerUrl('/maplibre-gl-worker.mjs');

export default function RestaurantMap({
  markers = [],
  selectedId,
  onMarkerPress,
  onMapPress,
  userLocation,
  focus,
  initialCenter,
  initialZoom = 12,
  pickedPoint,
  onPick,
}: RestaurantMapProps) {
  const mapRef = useRef<MapRef>(null);
  const theme = useResolvedTheme();

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: focus.zoom ?? Math.max(mapRef.current.getZoom(), 14),
      duration: 700,
    });
  }, [focus]);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        initialViewState={{ ...initialCenter, zoom: initialZoom }}
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
  pinSelected: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
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
