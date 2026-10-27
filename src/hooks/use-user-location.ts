import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type LatLng = { latitude: number; longitude: number };

/** Obelisco, CABA: centro por defecto si no hay ubicación. */
export const DEFAULT_CENTER: LatLng = { latitude: -34.6037, longitude: -58.3816 };

async function getLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  const apply = useCallback((coords: LatLng | null) => {
    setDenied(!coords);
    if (coords) setLocation(coords);
    return coords;
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLocation().then((coords) => {
      if (!cancelled) apply(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const locate = useCallback(async () => apply(await getLocation()), [apply]);

  return { location, denied, locate };
}
