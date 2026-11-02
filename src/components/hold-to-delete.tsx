import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, font, radius } from '@/theme/tokens';

const web = Platform.OS === 'web';
// Sin menú contextual ni selección al mantener apretado.
const noMenu = web ? ({ onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault() } as object) : {};
const noSelect = web ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as unknown as ViewStyle) : null;

/**
 * Botón de borrado que hay que mantener apretado `seconds` segundos. Una barra roja lo va llenando
 * para mostrar que la acción, que no se puede deshacer, está en marcha; soltar antes la cancela.
 * Mientras `busy`, queda lleno y bloqueado hasta que termine la operación.
 */
export function HoldToDeleteButton({
  seconds,
  onConfirm,
  busy,
  onHoldChange,
  onEarlyRelease,
  size = 38,
  iconSize = 20,
  background = colors.dangerSoft,
  label,
  style,
  accessibilityLabel,
}: {
  seconds: number;
  onConfirm: () => void;
  busy?: boolean;
  /** true al empezar a mantener, false al soltar o completar. */
  onHoldChange?: (holding: boolean) => void;
  /** Se soltó antes de tiempo: sirve para recordar que hay que mantener apretado. */
  onEarlyRelease?: () => void;
  size?: number;
  iconSize?: number;
  background?: string;
  /** Con texto se muestra como botón ancho (p. ej. en un diálogo) en vez de un ícono redondo. */
  label?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const completed = useRef(false);

  // Si la operación falla, vuelve a quedar disponible con la barra vacía.
  useEffect(() => {
    if (!busy && completed.current) {
      completed.current = false;
      progress.setValue(0);
    }
  }, [busy, progress]);

  function start() {
    if (busy || completed.current) return;
    onHoldChange?.(true);
    Animated.timing(progress, { toValue: 1, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false }).start(
      ({ finished }) => {
        if (!finished) return;
        completed.current = true;
        onHoldChange?.(false);
        onConfirm();
      },
    );
  }

  function release() {
    if (completed.current) return;
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    onHoldChange?.(false);
    onEarlyRelease?.();
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      {...noMenu}
      onPressIn={start}
      onPressOut={release}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Mantené apretado ${seconds} segundos para confirmar`}
      style={[
        styles.button,
        noSelect,
        label
          ? [styles.wide, { backgroundColor: background }]
          : { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        style,
      ]}>
      <Animated.View pointerEvents="none" style={[styles.fill, { width }]} />
      <Ionicons name="trash-outline" size={iconSize} color={colors.danger} />
      {label && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  wide: { flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 18, borderRadius: radius.md },
  label: { color: colors.danger, fontWeight: '800', fontSize: font.size.md, fontFamily: font.family },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.danger, opacity: 0.4 },
});
