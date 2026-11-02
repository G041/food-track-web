// La app se usa en vertical; solo el modal de menú (PDF) permite girar el teléfono.
// Los navegadores solo dejan trabar la orientación en la app instalada (Android) o en pantalla
// completa; en el resto de los casos estas llamadas no tienen efecto y no fallan.

type LockableOrientation = { lock?: (orientation: string) => Promise<void>; unlock?: () => void };

function orientation(): LockableOrientation | undefined {
  return typeof screen !== 'undefined' ? (screen.orientation as unknown as LockableOrientation) : undefined;
}

export function lockPortrait() {
  try {
    orientation()?.lock?.('portrait')?.catch(() => {});
  } catch {
    // Sin soporte: se ignora.
  }
}

export function allowRotation() {
  try {
    orientation()?.unlock?.();
  } catch {
    // Sin soporte: se ignora.
  }
}
