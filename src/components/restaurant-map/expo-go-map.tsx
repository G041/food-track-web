import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { categoryMeta } from '@/lib/categories';
import { useResolvedTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

import { type RestaurantMapProps } from './types';

// Mapa para Expo Go: usa react-native-maps (Apple Maps en iOS), que Expo Go trae incluido.
// Misma interfaz que native-map.tsx (MapLibre), que solo corre en un development build.
const zoomToDelta = (zoom: number) => 360 / 2 ** zoom;

export default function ExpoGoMap({
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
  const mapRef = useRef<MapView>(null);
  const theme = useResolvedTheme();

  useEffect(() => {
    if (!focus) return;
    const delta = zoomToDelta(focus.zoom ?? 15);
    mapRef.current?.animateToRegion(
      { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: delta, longitudeDelta: delta },
      700,
    );
  }, [focus]);

  const initialDelta = zoomToDelta(initialZoom);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: initialCenter.latitude,
          longitude: initialCenter.longitude,
          latitudeDelta: initialDelta,
          longitudeDelta: initialDelta,
        }}
        mapType="mutedStandard"
        userInterfaceStyle={theme}
        showsPointsOfInterests={false}
        showsCompass={false}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onPick?.({ latitude, longitude });
          onMapPress?.({ latitude, longitude });
        }}>
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={1}>
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
              key={`${m.id}-${selected}`}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              zIndex={selected ? 2 : 0}
              onPress={(e) => {
                e.stopPropagation();
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
            coordinate={pickedPoint}
            anchor={{ x: 0.5, y: 1 }}
            draggable
            tracksViewChanges={false}
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onPick?.({ latitude, longitude });
            }}>
            <Ionicons name="location" size={44} color={colors.primary} />
          </Marker>
        )}
      </MapView>
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
