import { useIsFocused } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';

/** Aparece con fundido y un leve desplazamiento cada vez que se monta. */
export function FadeIn({
  children,
  from = 12,
  delay = 0,
  duration = 260,
  style,
  pointerEvents,
}: {
  children: ReactNode;
  from?: number;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'auto';
}) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start();
  }, [v, delay, duration]);
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Repite la entrada cada vez que la pantalla (tab) vuelve a tener foco. */
export function ScreenTransition({
  children,
  style,
  pointerEvents,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'auto';
}) {
  const focused = useIsFocused();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!focused) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [focused, v]);
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Mantiene montado el contenido mientras termina la animación de salida.
 * Devuelve [montado, valor 0→1].
 */
export function useMountTransition(open: boolean, duration = 220) {
  const v = useState(() => new Animated.Value(open ? 1 : 0))[0];
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    Animated.timing(v, {
      toValue: open ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, v, duration]);
  return [mounted, v] as const;
}

/** Valor que hace un pequeño "rebote" cada vez que active pasa a true. */
export function usePop(active: boolean) {
  const v = useState(() => new Animated.Value(active ? 1 : 0))[0];
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, friction: 5, tension: 160, useNativeDriver: native }).start();
  }, [active, v]);
  return v;
}
