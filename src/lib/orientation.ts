import * as ScreenOrientation from 'expo-screen-orientation';

// La app se usa en vertical; solo el modal de menú (PDF) permite girar el teléfono.

export function lockPortrait() {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}

export function allowRotation() {
  ScreenOrientation.unlockAsync().catch(() => {});
}
