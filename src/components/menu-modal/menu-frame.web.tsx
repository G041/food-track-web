import { useEffect, useRef, useState } from 'react';

import type { MenuFrameProps } from './types';

export default function MenuFrame(props: MenuFrameProps) {
  return <ZoomableMenuFrame key={props.src} {...props} />;
}

function ZoomableMenuFrame({ src, onLoad }: MenuFrameProps) {
  const [scale, setScale] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const horizontalRange = Math.max(0, size.width * (scale - 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
      <div role="group" aria-label="Zoom del menú" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, position: 'absolute', bottom: 'max(16px, env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 2, borderRadius: 28, background: 'rgba(30, 27, 25, 0.88)', color: '#fff', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'  }}>
        <button type="button" aria-label="Reducir menú" disabled={scale <= 0.5} onClick={() => setScale(value => Math.max(0.5, value - 0.25))} style={{ ...zoomButtonStyle, opacity: scale <= 0.5 ? 0.4 : 1 }}>−</button>
        <button type="button" aria-label="Restablecer zoom del menú" onClick={() => setScale(1)} style={{ ...zoomButtonStyle, minWidth: 60, fontSize: 14 }}>{Math.round(scale * 100)}%</button>
        <button type="button" aria-label="Ampliar menú" disabled={scale >= 3} onClick={() => setScale(value => Math.min(3, value + 0.25))} style={{ ...zoomButtonStyle, opacity: scale >= 3 ? 0.4 : 1 }}>+</button>
      </div>
      <div ref={viewport} onScroll={event => setScrollLeft(event.currentTarget.scrollLeft)} style={{ flex: 1, minHeight: 0, overflow: 'auto', overscrollBehavior: 'contain' }}>
        <div style={{ width: size.width * scale, height: size.height * scale, position: 'relative' }}>
          {size.width > 0 && size.height > 0 && <iframe
            key={src}
            src={src}
            title="Menú del restaurante"
            onLoad={onLoad}
            // Siempre aislado. No allow-top-navigation: el sitio no puede sacar al usuario de la app
            // (ni llevarlo a una página falsa de login). Los PDF se muestran con un visor HTML por eso mismo:
            // el visor nativo del navegador no funciona dentro de un sandbox.
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            referrerPolicy="no-referrer"
            style={{ border: 0, width: size.width, height: size.height, backgroundColor: '#fff', transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />}
        </div>
      </div>
      {horizontalRange > 0 && (
        <div style={{ position: 'absolute', bottom: 'calc(max(16px, env(safe-area-inset-bottom, 0px)) + 60px)', left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 'min(80%, 360px)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', minHeight: 48, borderRadius: 24, background: 'rgba(30, 27, 25, 0.88)', color: '#fff', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
          <span aria-hidden="true">↔</span>
          <input
            type="range"
            aria-label="Mover el menú horizontalmente"
            aria-valuetext={`${Math.round(Math.min(scrollLeft, horizontalRange) / horizontalRange * 100)}%`}
            min={0}
            max={horizontalRange}
            step="any"
            value={Math.min(scrollLeft, horizontalRange)}
            onChange={event => {
              const left = Number(event.currentTarget.value);
              viewport.current?.scrollTo({ left, behavior: 'instant' });
              setScrollLeft(left);
            }}
            style={{ flex: 1, minWidth: 0, height: 44, margin: 0, accentColor: '#fff', cursor: 'ew-resize' }}
          />
        </div>
      )}
    </div>
  );
}

const zoomButtonStyle = {
  minWidth: 44,
  minHeight: 44,
  border: 0,
  borderRadius: 22,
  background: 'transparent',
  color: '#fff',
  fontSize: 22,
  cursor: 'pointer',
};
