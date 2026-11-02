import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, Map, Marker, ViewAnnotation, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { categoryMeta } from '@/lib/categories';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

import { MAP_STYLE_URLS, type RestaurantMapProps } from './types';

// Mapa nativo (iOS/Android) con MapLibre Native. Misma interfaz y mismo estilo de mapa que index.web.tsx.
// Lo carga index.tsx solo fuera de Expo Go (Expo Go no trae el módulo nativo de MapLibre).
export default function NativeMap({
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
  const cameraRef = useRef<CameraRef>(null);
  // En nativo, tocar un marcador también puede disparar el toque del mapa: se ignora ese segundo evento.
  const lastMarkerPress = useRef(0);
  const theme = useResolvedTheme();

  useEffect(() => {
    if (!focus) return;
    (async () => {
      const zoom = focus.zoom ?? Math.max((await mapRef.current?.getZoom()) ?? 0, 14);
      cameraRef.current?.flyTo({ center: [focus.longitude, focus.latitude], zoom, duration: 700 });
    })();
  }, [focus]);

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URLS[theme]}
        logo={false}
        attributionPosition={{ bottom: 8, left: 8 }}
        compass={false}
        onPress={(e) => {
          if (Date.now() - lastMarkerPress.current < 400) return;
          const [longitude, latitude] = e.nativeEvent.lngLat;
          onPick?.({ latitude, longitude });
          onMapPress?.({ latitude, longitude });
        }}>
        <Camera
          ref={cameraRef}
          initialViewState={{ center: [initialCenter.longitude, initialCenter.latitude], zoom: initialZoom }}
        />

        {userLocation && (
          <Marker id="user-location" lngLat={[userLocation.longitude, userLocation.latitude]} anchor="center">
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
              id={`restaurant-${m.id}`}
              lngLat={[m.longitude, m.latitude]}
              anchor="bottom"
              onPress={() => {
                lastMarkerPress.current = Date.now();
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
          <ViewAnnotation
            id="picked-point"
            lngLat={[pickedPoint.longitude, pickedPoint.latitude]}
            anchor="bottom"
            draggable
            onDragEnd={(e) => {
              const [longitude, latitude] = e.nativeEvent.lngLat;
              onPick?.({ latitude, longitude });
            }}>
            <Ionicons name="location" size={44} color={colors.primary} />
          </ViewAnnotation>
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
