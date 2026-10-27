import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, space } from '@/theme/tokens';

import type { RestaurantMapProps } from './types';

export type { MapMarker, RestaurantMapProps } from './types';

// Implementación nativa pendiente (fase 5): @maplibre/maplibre-react-native con la misma interfaz.
// La web usa index.web.tsx.
export default function RestaurantMap({ markers = [] }: RestaurantMapProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={40} color={colors.inkMuted} />
      <Text style={styles.text}>
        El mapa nativo todavía no está disponible ({markers.length} lugares cargados).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceAlt,
    padding: space.xl,
  },
  text: { color: colors.inkSoft, fontSize: font.size.sm, textAlign: 'center' },
});
