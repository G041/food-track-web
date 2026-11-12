import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import { ApiError } from '@/lib/api';

import { CAPTCHA_FAILED, CAPTCHA_SITE_KEY, CAPTCHA_TIMEOUT_MS, type CaptchaHandle } from './types';

export type { CaptchaHandle };

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(container: HTMLElement): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoading: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  const ready = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
  scriptLoading ??= new Promise<Turnstile>((resolve, reject) => {
    const existing = ready();
    if (existing) return resolve(existing);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const turnstile = ready();
      if (turnstile) resolve(turnstile);
      else reject(new ApiError(CAPTCHA_FAILED));
    };
    script.onerror = () => {
      scriptLoading = null; // se reintenta en el próximo pedido
      script.remove();
      reject(new ApiError(CAPTCHA_FAILED));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/** Web: widget de Turnstile. Queda invisible salvo que Cloudflare pida un desafío interactivo. */
export function Captcha({ ref }: { ref?: Ref<CaptchaHandle> }) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null);

  useImperativeHandle(ref, () => ({
    async getToken() {
      if (!CAPTCHA_SITE_KEY) return undefined;
      const turnstile = await loadTurnstile();
      const container = host.current;
      if (!container) throw new ApiError(CAPTCHA_FAILED);

      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => settle(() => reject(new ApiError(CAPTCHA_FAILED))), CAPTCHA_TIMEOUT_MS);
        const settle = (finish: () => void) => {
          clearTimeout(timer);
          pending.current = null;
          finish();
        };
        pending.current?.reject(new ApiError(CAPTCHA_FAILED));
        pending.current = {
          resolve: (token) => settle(() => resolve(token)),
          reject: (error) => settle(() => reject(error)),
        };

        if (widget.current == null) {
          widget.current = turnstile.render(container, {
            sitekey: CAPTCHA_SITE_KEY,
            execution: 'execute',
            appearance: 'interaction-only',
            callback: (token: string) => pending.current?.resolve(token),
            'error-callback': () => pending.current?.reject(new ApiError(CAPTCHA_FAILED)),
            'timeout-callback': () => pending.current?.reject(new ApiError(CAPTCHA_FAILED)),
          });
        } else {
          turnstile.reset(widget.current); // cada token sirve una sola vez
        }
        turnstile.execute(container);
      });
    },
  }));

  useEffect(
    () => () => {
      const id = widget.current;
      if (id != null) (window as unknown as { turnstile?: Turnstile }).turnstile?.remove(id);
    },
    [],
  );

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={host} style={{ display: 'flex', justifyContent: 'center' }} />;
}
