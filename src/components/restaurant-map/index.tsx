import Ionicons from '@expo/vector-icons/Ionicons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, space } from '@/theme/tokens';

import type { RestaurantMapProps } from './types';

export type { MapMarker, RestaurantMapProps } from './types';

// Expo Go no trae el módulo nativo de MapLibre: ahí se muestra un aviso en vez del mapa, para poder
// probar el resto de la app. En un development build o en la app publicada se carga el mapa real.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const NativeMap: ComponentType<RestaurantMapProps> | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./native-map').default;

export default function RestaurantMap(props: RestaurantMapProps) {
  if (NativeMap) return <NativeMap {...props} />;
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={40} color={colors.inkMuted} />
      <Text style={styles.text}>
        El mapa no está disponible en Expo Go ({props.markers?.length ?? 0} lugares cargados). Se ve en el development
        build.
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
