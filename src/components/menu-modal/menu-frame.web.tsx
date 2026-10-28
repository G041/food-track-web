import type { MenuFrameProps } from './types';

export default function MenuFrame({ src, sandboxed, onLoad }: MenuFrameProps) {
  return (
    <iframe
      key={src}
      src={src}
      title="Menú del restaurante"
      onLoad={onLoad}
      // sandbox sin allow-top-navigation: el sitio no puede sacar al usuario de la app.
      // Los PDF no se sandboxean porque el visor de PDF de Chrome no funciona dentro de un sandbox.
      sandbox={sandboxed ? 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms' : undefined}
      referrerPolicy="no-referrer"
      style={{ border: 0, width: '100%', height: '100%', backgroundColor: '#fff' }}
    />
  );
}
