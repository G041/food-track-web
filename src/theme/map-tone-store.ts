import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

// Tono del mapa elegido por el usuario (Perfil → Apariencia → Tono del mapa), uno para cada tema.
export type LightMapTone = 'blanco' | 'calido' | 'gris';
export type DarkMapTone = 'negro' | 'gris-oscuro' | 'gris-claro';

const LIGHT_KEY = 'foodtrack-map-tone-light';
const DARK_KEY = 'foodtrack-map-tone-dark';

const LIGHT_TONES: LightMapTone[] = ['blanco', 'calido', 'gris'];
const DARK_TONES: DarkMapTone[] = ['negro', 'gris-oscuro', 'gris-claro'];

function read<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = globalThis.localStorage?.getItem(key);
    if (v && (allowed as string[]).includes(v)) return v as T;
  } catch {}
  return fallback;
}

function save(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {}
  if (Platform.OS !== 'web') AsyncStorage.setItem(key, value).catch(() => {});
}

type MapToneState = {
  light: LightMapTone;
  dark: DarkMapTone;
  setLight: (tone: LightMapTone) => void;
  setDark: (tone: DarkMapTone) => void;
};

export const useMapTone = create<MapToneState>((set) => ({
  light: read(LIGHT_KEY, LIGHT_TONES, 'blanco'),
  dark: read(DARK_KEY, DARK_TONES, 'negro'),
  setLight: (light) => {
    save(LIGHT_KEY, light);
    set({ light });
  },
  setDark: (dark) => {
    save(DARK_KEY, dark);
    set({ dark });
  },
}));

// En nativo no hay localStorage: las preferencias viven en AsyncStorage y se cargan al arrancar.
if (Platform.OS !== 'web') {
  AsyncStorage.multiGet([LIGHT_KEY, DARK_KEY])
    .then(([[, light], [, dark]]) => {
      const next: Partial<MapToneState> = {};
      if (light && (LIGHT_TONES as string[]).includes(light)) next.light = light as LightMapTone;
      if (dark && (DARK_TONES as string[]).includes(dark)) next.dark = dark as DarkMapTone;
      useMapTone.setState(next);
    })
    .catch(() => {});
}
