import * as WebBrowser from 'expo-web-browser';

// En web abre una pestaña nueva; en nativo, el navegador in-app.
// No se embebe el menú: muchos sitios bloquean iframes (X-Frame-Options).
export function openMenu(url: string) {
  return WebBrowser.openBrowserAsync(url);
}

export function openDirections(latitude: number, longitude: number) {
  return WebBrowser.openBrowserAsync(
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  );
}
