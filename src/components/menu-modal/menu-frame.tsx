import { Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

import type { MenuFrameProps } from './types';

// Lo único que un menú puede pedir abrir fuera del visor, y siempre con confirmación del usuario.
const EXTERNAL: Record<string, string> = {
  tel: 'llamar a un número',
  mailto: 'escribir un email',
  sms: 'enviar un mensaje',
  whatsapp: 'abrir WhatsApp',
  geo: 'abrir un mapa',
  maps: 'abrir un mapa',
};

/** El sitio del menú es contenido de terceros: no abre otras apps por su cuenta. */
function confirmExternal(url: string) {
  const scheme = url.slice(0, url.indexOf(':')).toLowerCase();
  const action = EXTERNAL[scheme];
  if (!action) return; // intent:, esquemas de otras apps, file:, etc.: se ignoran
  Alert.alert('Salir del menú', `Este menú quiere ${action}.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Abrir', onPress: () => Linking.openURL(url).catch(() => {}) },
  ]);
}

// Nativo: WebView no tiene la restricción de iframes de la web (X-Frame-Options), así que
// también se ven adentro los menús que en web solo se abren afuera.
export default function MenuFrame({ src, onLoad }: MenuFrameProps) {
  return (
    <WebView
      key={src}
      source={{ uri: src }}
      onLoadEnd={onLoad}
      // Los links target="_blank" se abren en el mismo WebView en vez de quedar muertos.
      setSupportMultipleWindows={false}
      // Equivalente al sandbox de la web: dentro del visor solo se navega por la web.
      onShouldStartLoadWithRequest={(req) => {
        if (/^(https?|about|blob|data):/i.test(req.url)) return true;
        confirmExternal(req.url);
        return false;
      }}
      allowsInlineMediaPlayback
      style={{ flex: 1, backgroundColor: '#fff' }}
    />
  );
}
