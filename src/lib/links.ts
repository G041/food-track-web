import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// En web abre una pestaña nueva; en nativo, el navegador in-app.
// No se embebe el menú: muchos sitios bloquean iframes (X-Frame-Options).
export function openMenu(url: string) {
  return WebBrowser.openBrowserAsync(url);
}

export function openDirections(latitude: number, longitude: number) {
  const google = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  if (Platform.OS === 'web') {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) {
      // Apple Maps siempre está instalado y se abre sin dejar una página sin salida dentro de la app instalada.
      window.location.assign(`https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`);
    } else if (/Android/.test(ua)) {
      // En Android el enlace de Maps se entrega a la app sin dejar una pestaña vacía.
      window.location.assign(google);
    } else {
      // En computadora se abre en una pestaña nueva con la dirección ya cargada, sin sacar al usuario de FoodTrack.
      window.open(google, '_blank', 'noopener');
    }
    return;
  }
  return Linking.openURL(google);
}
