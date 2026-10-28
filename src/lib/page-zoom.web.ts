// Zoom de página: deshabilitado en toda la app (sensación nativa) salvo en el modal de menú.
const LOCKED = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const UNLOCKED = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover';

let allowZoom = false;

// iOS ignora user-scalable=no: hay que cancelar el gesto de pellizco a mano.
if (typeof document !== 'undefined') {
  const block = (e: Event) => {
    if (!allowZoom) e.preventDefault();
  };
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
}

export function setPageZoomEnabled(enabled: boolean) {
  allowZoom = enabled;
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', enabled ? UNLOCKED : LOCKED);
}
