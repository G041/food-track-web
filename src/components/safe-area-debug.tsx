import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { isIosStandalone, useHeaderOffset, useStatusBarInset, useTabBarBottom } from '@/hooks/use-header-offset';

type Probe = Record<string, string | number | boolean>;

/** Lee env(safe-area-inset-*) directo del navegador, para compararlo con lo que reporta la librería. */
function measureEnv(): Probe {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const r = {
    'env top': cs.paddingTop,
    'env bottom': cs.paddingBottom,
    'env left/right': `${cs.paddingLeft} / ${cs.paddingRight}`,
  };
  el.remove();
  return {
    ...r,
    standalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
    ventana: `${window.innerWidth}×${window.innerHeight}`,
    pantalla: `${screen.width}×${screen.height} @${window.devicePixelRatio}x`,
    'visual viewport': window.visualViewport ? `${Math.round(window.visualViewport.width)}×${Math.round(window.visualViewport.height)}` : '—',
    navegador: navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, '$1').slice(0, 60),
  };
}

/** Visibilidad del panel: se abre con ?debug=1 o desde Perfil (admins), útil en la app instalada. */
export const useDebugPanel = create<{ visible: boolean; setVisible: (v: boolean) => void }>((set) => ({
  visible: Platform.OS === 'web' && typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'),
  setVisible: (visible) => set({ visible }),
}));

/** Panel de diagnóstico: muestra las zonas seguras y medidas reales del dispositivo. */
export function SafeAreaDebug() {
  const insets = useSafeAreaInsets();
  const header = useHeaderOffset();
  const statusBar = useStatusBarInset();
  const barBottom = useTabBarBottom();
  const [env, setEnv] = useState<Probe | null>(null);
  const { visible, setVisible } = useDebugPanel();

  useEffect(() => {
    if (!visible) return;
    const update = () => setEnv(measureEnv());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [visible]);

  if (!visible) return null;
  const rows: Probe = {
    'lib top/bottom': `${insets.top} / ${insets.bottom}`,
    'barra de estado': `${statusBar}px${isIosStandalone() && insets.top === 0 ? ' (estimada)' : ''}`,
    'header en': `${header}px`,
    'barra en': `${barBottom}px del borde`,
    ...env,
  };
  return (
    <Pressable style={styles.panel} onPress={() => setVisible(false)} accessibilityLabel="Cerrar diagnóstico">
      <Text style={styles.title}>Diagnóstico de pantalla (tocar para cerrar)</Text>
      {Object.entries(rows).map(([k, v]) => (
        <Text key={k} style={styles.row}>
          <Text style={styles.key}>{k}: </Text>
          {String(v)}
        </Text>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '35%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    gap: 2,
  },
  title: { color: '#F4B23E', fontWeight: '800', marginBottom: 4 },
  row: { color: '#fff', fontSize: 12, fontFamily: Platform.select({ web: 'ui-monospace, monospace', default: undefined }) },
  key: { color: '#9ad', fontWeight: '700' },
});
