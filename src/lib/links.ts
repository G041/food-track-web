import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// En web abre una pestaña nueva; en nativo, el navegador in-app.
// No se embebe el menú: muchos sitios bloquean iframes (X-Frame-Options).
export function openMenu(url: string) {
  return WebBrowser.openBrowserAsync(url);
}

export function openDirections(latitude: number, longitude: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  if (Platform.OS === 'web') {
    // Let the Maps link hand off to the app without leaving an empty popup behind.
    window.location.assign(url);
    return;
  }
  return Linking.openURL(url);
}
