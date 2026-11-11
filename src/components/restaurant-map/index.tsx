import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';

import type { RestaurantMapProps } from './types';

export type { MapMarker, RestaurantMapProps } from './types';

// Expo Go no trae el módulo nativo de MapLibre: ahí se usa react-native-maps (Apple Maps en iOS),
// que Expo Go sí incluye, para poder probar el mapa. En un development build o en la app publicada
// se carga el mapa real con MapLibre.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const RestaurantMap: ComponentType<RestaurantMapProps> = isExpoGo
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./expo-go-map').default
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./native-map').default;

export default RestaurantMap;
