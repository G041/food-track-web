import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

import type { MenuFrameProps } from './types';

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
      // Equivalente al sandbox de la web: el sitio no abre otras apps (tel:, intent:, etc.) sin pasar por el sistema.
      onShouldStartLoadWithRequest={(req) => {
        if (/^(https?|about|blob|data):/i.test(req.url)) return true;
        Linking.openURL(req.url).catch(() => {});
        return false;
      }}
      allowsInlineMediaPlayback
      style={{ flex: 1, backgroundColor: '#fff' }}
    />
  );
}
