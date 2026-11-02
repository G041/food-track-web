import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

function isInstalledWebApp() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Abre el menú en el navegador predeterminado del usuario, fuera de FoodTrack.
 * Se usa cuando el sitio no se puede mostrar dentro de la app (muchos bloquean iframes con X-Frame-Options).
 */
export function openMenu(url: string) {
  if (Platform.OS !== 'web') return Linking.openURL(url);

  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isInstalledWebApp()) {
    // Desde la app instalada, un link normal se abre en una ventana interna de la propia app.
    if (ios) {
      // Esquema de iOS que entrega el link a Safari.
      window.location.href = url.replace(/^http/i, 'x-safari-http');
      return;
    }
    if (/Android/.test(ua)) {
      // Intent de Android: abre el link con el navegador predeterminado.
      const parsed = new URL(url);
      window.location.href = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${parsed.protocol.replace(':', '')};action=android.intent.action.VIEW;end`;
      return;
    }
  }
  // Navegador común o computadora: pestaña nueva, ya en el navegador del usuario.
  window.open(url, '_blank', 'noopener,noreferrer');
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
