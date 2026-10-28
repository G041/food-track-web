import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/**
 * true mientras el teclado en pantalla está abierto. En web se aproxima con el foco de un campo
 * de texto en dispositivos táctiles (en escritorio no hay teclado en pantalla).
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
      const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
      return () => {
        show.remove();
        hide.remove();
      };
    }
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return;
    const onIn = (e: FocusEvent) => isTextField(e.target) && setVisible(true);
    const onOut = (e: FocusEvent) => isTextField(e.target) && setVisible(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  // Si el campo con foco desaparece (p. ej. el formulario de login al ingresar), el navegador
  // no emite focusout: se verifica mientras el teclado figure abierto.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const id = setInterval(() => {
      if (!isTextField(document.activeElement)) setVisible(false);
    }, 400);
    return () => clearInterval(id);
  }, [visible]);

  return visible;
}
