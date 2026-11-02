import { useEffect, useState } from 'react';

import { useMapTone, type DarkMapTone, type LightMapTone } from '@/theme/map-tone-store';
import { useResolvedTheme, type ResolvedTheme } from '@/theme/theme-store';

import { MAP_STYLE_URLS } from './types';

/** Colores por "rol" de capa del mapa. Textos, íconos y pines no se tocan. */
type TonePalette = {
  background: string;
  residential: string;
  park: string;
  water: string;
  building: string;
  buildingOutline: string;
  roadMinor: string;
  roadMajor: string;
  roadCasing: string;
  roadSubtle: string;
  rail: string;
  boundary: string;
};

// null = el estilo original de OpenFreeMap, sin cambios.
const LIGHT: Record<LightMapTone, TonePalette | null> = {
  blanco: null,
  calido: {
    background: '#f4efe6',
    residential: '#efe8dc',
    park: '#e2e8d4',
    water: '#c6d5dc',
    building: '#ebe3d6',
    buildingOutline: '#ddd3c4',
    roadMinor: '#e4dccf',
    roadMajor: '#ffffff',
    roadCasing: '#d6ccbc',
    roadSubtle: 'rgba(214,204,188,0.6)',
    rail: '#d8cfc1',
    boundary: '#b5ab9c',
  },
  gris: {
    background: '#dfe1e3',
    residential: '#d9dbde',
    park: '#d2d8d2',
    water: '#b3bdc4',
    building: '#d3d6d9',
    buildingOutline: '#c4c8cc',
    roadMinor: '#ced1d5',
    roadMajor: '#f3f4f5',
    roadCasing: '#bcc1c6',
    roadSubtle: 'rgba(188,193,198,0.6)',
    rail: '#c3c7cb',
    boundary: '#9aa0a6',
  },
};

const DARK: Record<DarkMapTone, TonePalette | null> = {
  negro: null,
  'gris-oscuro': {
    background: '#2a2c30',
    residential: '#2e3034',
    park: '#2e3631',
    water: '#1e2630',
    building: '#33363b',
    buildingOutline: '#3d4045',
    roadMinor: '#383b40',
    roadMajor: '#44474d',
    roadCasing: '#50545b',
    roadSubtle: 'rgba(80,84,91,0.6)',
    rail: '#45484d',
    boundary: '#5c6066',
  },
  'gris-claro': {
    background: '#3e4147',
    residential: '#43464c',
    park: '#424a45',
    water: '#2d3742',
    building: '#494c52',
    buildingOutline: '#54575d',
    roadMinor: '#4f5359',
    roadMajor: '#5c6067',
    roadCasing: '#6a6e75',
    roadSubtle: 'rgba(106,110,117,0.6)',
    rail: '#5b5e64',
    boundary: '#767a81',
  },
};

/** Muestras para el selector de Perfil (fondo, calle y agua del tono). */
export function toneSwatch(theme: ResolvedTheme, tone: LightMapTone | DarkMapTone) {
  const p = theme === 'light' ? LIGHT[tone as LightMapTone] : DARK[tone as DarkMapTone];
  if (p) return { background: p.background, road: p.roadMajor, water: p.water };
  return theme === 'light'
    ? { background: '#f2f3f0', road: '#ffffff', water: '#c2c8ca' }
    : { background: '#0c0c0c', road: '#2a2a2a', water: '#1b1b1d' };
}

type Layer = { id: string; type: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };
type Style = { layers: Layer[] } & Record<string, unknown>;

/** Rol de una capa según su id (estilos positron y dark de OpenFreeMap). */
function roleOf(layer: Layer): keyof TonePalette | null {
  const id = layer.id;
  if (layer.type === 'background') return 'background';
  if (/^(road_area_pier|road_pier|landcover_ice_shelf|landcover_glacier|aeroway-area|aeroway-runway)$/.test(id)) return 'background';
  if (/^railway.*dashline$/.test(id)) return 'background';
  if (id === 'landuse_residential') return 'residential';
  if (/^(park|landuse_park|landcover_wood)$/.test(id)) return 'park';
  if (id === 'water' || id === 'waterway') return 'water';
  if (id === 'building') return 'building';
  if (/^(highway_path|highway_minor|aeroway-taxiway)$/.test(id)) return 'roadMinor';
  if (/_inner$/.test(id)) return 'roadMajor';
  if (/(_casing|runway-casing)$/.test(id)) return 'roadCasing';
  if (/_subtle$/.test(id)) return 'roadSubtle';
  if (/^railway/.test(id)) return 'rail';
  if (/^boundary/.test(id)) return 'boundary';
  return null;
}

const COLOR_PROP: Record<string, string> = { background: 'background-color', fill: 'fill-color', line: 'line-color' };

function applyTone(style: Style, palette: TonePalette): Style {
  const layers = style.layers.map((layer) => {
    if (layer.type === 'symbol') {
      // El halo de los textos acompaña al fondo para que sigan legibles.
      if (!layer.paint || !('text-halo-color' in layer.paint)) return layer;
      return { ...layer, paint: { ...layer.paint, 'text-halo-color': palette.background } };
    }
    const role = roleOf(layer);
    const prop = COLOR_PROP[layer.type];
    if (!role || !prop) return layer;
    const paint: Record<string, unknown> = { ...layer.paint, [prop]: palette[role] };
    if (role === 'building') paint['fill-outline-color'] = palette.buildingOutline;
    return { ...layer, paint };
  });
  return { ...style, layers };
}

const cache = new Map<string, Promise<Style>>();
function loadStyle(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`style ${r.status}`);
      return r.json() as Promise<Style>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/**
 * Estilo del mapa según el tema y el tono elegido por el usuario. Devuelve la URL original cuando
 * el tono es el original (o mientras se descarga el estilo), y el estilo recoloreado en otro caso.
 */
export function useMapStyle(): string | Style {
  const theme = useResolvedTheme();
  const tone = useMapTone((s) => (theme === 'light' ? s.light : s.dark));
  const url = MAP_STYLE_URLS[theme];
  const palette = theme === 'light' ? LIGHT[tone as LightMapTone] : DARK[tone as DarkMapTone];
  const [styled, setStyled] = useState<{ key: string; style: Style } | null>(null);
  const key = `${url}|${tone}`;

  useEffect(() => {
    if (!palette) return;
    let alive = true;
    loadStyle(url)
      .then((base) => {
        if (alive) setStyled({ key, style: applyTone(base, palette) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, key, palette]);

  if (!palette) return url;
  return styled?.key === key ? styled.style : url;
}
