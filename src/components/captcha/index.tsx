import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ApiError } from '@/lib/api';

import { CAPTCHA_FAILED, CAPTCHA_SITE_KEY, CAPTCHA_TIMEOUT_MS, type CaptchaHandle } from './types';

export type { CaptchaHandle };

// Turnstile solo funciona en una página web de un dominio autorizado para la clave: en nativo se carga
// /captcha.html del sitio de FoodTrack en un WebView, que devuelve el token por postMessage.
const SITE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const CHALLENGE_ORIGIN = 'https://challenges.cloudflare.com';

type Message = { type: 'token'; token: string } | { type: 'error' } | { type: 'interactive'; on: boolean };

/** Nativo: el WebView solo existe mientras se pide un token y solo se ve si hay un desafío interactivo. */
export function Captcha({ ref }: { ref?: Ref<CaptchaHandle> }) {
  const enabled = !!CAPTCHA_SITE_KEY && SITE_URL.startsWith('https://');
  // Cada pedido monta un WebView nuevo: los tokens sirven una sola vez.
  const [attempt, setAttempt] = useState<number | null>(null);
  const [interactive, setInteractive] = useState(false);
  const counter = useRef(0);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null);

  useImperativeHandle(ref, () => ({
    getToken() {
      if (!enabled) return Promise.resolve(undefined);
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => settle(() => reject(new ApiError(CAPTCHA_FAILED))), CAPTCHA_TIMEOUT_MS);
        const settle = (finish: () => void) => {
          clearTimeout(timer);
          pending.current = null;
          setAttempt(null);
          setInteractive(false);
          finish();
        };
        pending.current?.reject(new ApiError(CAPTCHA_FAILED));
        pending.current = {
          resolve: (token) => settle(() => resolve(token)),
          reject: (error) => settle(() => reject(error)),
        };
        counter.current += 1;
        setAttempt(counter.current);
      });
    },
  }));

  if (!enabled || attempt == null) return null;

  const pageUrl = `${SITE_URL}/captcha.html?k=${encodeURIComponent(CAPTCHA_SITE_KEY)}`;
  return (
    <View style={{ height: interactive ? 72 : 0, overflow: 'hidden' }}>
      <WebView
        key={attempt}
        source={{ uri: pageUrl }}
        // Solo la página propia y el desafío de Cloudflare: nada más se carga ni se abre desde acá.
        originWhitelist={['https://*']}
        onShouldStartLoadWithRequest={(req) =>
          req.url.startsWith(`${SITE_URL}/`) || req.url.startsWith(`${CHALLENGE_ORIGIN}/`) || req.url.startsWith('about:')
        }
        setSupportMultipleWindows={false}
        onError={() => pending.current?.reject(new ApiError(CAPTCHA_FAILED))}
        onHttpError={() => pending.current?.reject(new ApiError(CAPTCHA_FAILED))}
        onMessage={(event) => {
          // Solo se aceptan mensajes de la página propia.
          if (!event.nativeEvent.url.startsWith(`${SITE_URL}/captcha.html`)) return;
          let message: Message;
          try {
            message = JSON.parse(event.nativeEvent.data) as Message;
          } catch {
            return;
          }
          if (message.type === 'token' && typeof message.token === 'string' && message.token) {
            pending.current?.resolve(message.token);
          } else if (message.type === 'error') {
            pending.current?.reject(new ApiError(CAPTCHA_FAILED));
          } else if (message.type === 'interactive') {
            setInteractive(message.on === true);
          }
        }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
