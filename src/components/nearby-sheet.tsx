import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type ViewStyle,
} from 'react-native';

import { colors, font, MAX_CONTENT_WIDTH, radius, shadow, space } from '@/theme/tokens';

export type SheetSnap = 'collapsed' | 'half' | 'full';

// Lo que asoma con el panel escondido: manija + título + subtítulo, más lo que sobresale
// el botón central del mapa por encima de la barra de tabs.
const HANDLE_AREA = 72;
const MAP_BUTTON_OVERHANG = 34;
const ORDER: SheetSnap[] = ['collapsed', 'half', 'full'];
const native = Platform.OS !== 'web';

/**
 * Panel deslizable sobre el mapa con tres posiciones (como Airbnb):
 * escondido (asoma la manija), a media altura, o completo (tapa el mapa).
 * Se arrastra desde la manija/título; tocarla alterna entre posiciones.
 */
export function NearbySheet({
  snap,
  onSnapChange,
  fullTop,
  bottomInset,
  title,
  subtitle,
  headerAccessory,
  floatingOverMap,
  scrollKey,
  children,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Hasta dónde sube el panel abierto por completo (debajo del buscador). */
  fullTop: number;
  /** Espacio ocupado por la barra de tabs flotante. */
  bottomInset: number;
  title: string;
  subtitle?: string;
  headerAccessory?: ReactNode;
  /** Controles que flotan sobre el borde del panel (p. ej. "centrar en mí"). */
  floatingOverMap?: ReactNode;
  /** Cuando cambia, la lista vuelve arriba. */
  scrollKey?: unknown;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.max(0, height - fullTop);

  const positions = useMemo(() => {
    const collapsed = Math.max(0, sheetHeight - (bottomInset + MAP_BUTTON_OVERHANG + HANDLE_AREA));
    const half = Math.min(collapsed, Math.max(0, sheetHeight - Math.round(height * 0.5)));
    return { full: 0, half, collapsed } as Record<SheetSnap, number>;
  }, [sheetHeight, bottomInset, height]);

  const [y] = useState(() => new Animated.Value(positions[snap]));
  const current = useRef(positions[snap]);
  const start = useRef(0);
  const latest = useRef({ positions, snap, onSnapChange });
  useEffect(() => {
    latest.current = { positions, snap, onSnapChange };
  });
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const id = y.addListener(({ value }) => (current.current = value));
    return () => y.removeListener(id);
  }, [y]);

  useEffect(() => {
    Animated.spring(y, { toValue: positions[snap], useNativeDriver: native, bounciness: 2, speed: 14 }).start();
  }, [snap, positions, y]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollKey]);

  // Los handlers leen refs solo cuando ocurre el gesto (no durante el render).
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          y.stopAnimation();
          start.current = current.current;
        },
        onPanResponderMove: (_e, g) => {
          y.setValue(Math.min(latest.current.positions.collapsed, Math.max(0, start.current + g.dy)));
        },
        onPanResponderRelease: (_e, g) => {
          const { positions, snap, onSnapChange } = latest.current;
          // Un toque (sin arrastre) alterna; un gesto rápido avanza una posición; si no, la más cercana.
          if (Math.abs(g.dy) < 6) {
            onSnapChange(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'half');
            return;
          }
          const value = start.current + g.dy;
          const idx = ORDER.indexOf(snap);
          let next: SheetSnap;
          if (g.vy < -0.5) next = ORDER[Math.min(2, idx + 1)];
          else if (g.vy > 0.5) next = ORDER[Math.max(0, idx - 1)];
          else next = ORDER.reduce((a, b) => (Math.abs(positions[a] - value) <= Math.abs(positions[b] - value) ? a : b));
          if (next === snap) Animated.spring(y, { toValue: positions[snap], useNativeDriver: native, bounciness: 2 }).start();
          else onSnapChange(next);
        },
      }),
  );

  // La lista se desvanece al esconder el panel (solo queda la manija con el título).
  const listOpacity = y.interpolate({
    inputRange: [Math.max(0, positions.half - 1), Math.max(1, positions.collapsed)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const floatingOpacity = y.interpolate({
    inputRange: [0, Math.max(1, positions.half * 0.6), Math.max(2, positions.half)],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.sheet, { top: fullTop, height: sheetHeight, transform: [{ translateY: y }] }]}>
        {floatingOverMap && (
          <Animated.View pointerEvents={snap === 'full' ? 'none' : 'box-none'} style={[styles.floating, { opacity: floatingOpacity }]}>
            {floatingOverMap}
          </Animated.View>
        )}
        <View style={styles.panel}>
          <View
            {...responder.panHandlers}
            style={[styles.header, Platform.OS === 'web' && ({ touchAction: 'none', cursor: 'grab' } as unknown as ViewStyle)]}
            accessibilityRole="adjustable"
            accessibilityLabel="Panel de lugares cercanos: arrastrá para abrir o cerrar">
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {headerAccessory}
            </View>
          </View>
          <Animated.ScrollView
            ref={scrollRef}
            style={{ opacity: listOpacity }}
            scrollEnabled={snap !== 'collapsed'}
            contentContainerStyle={[styles.list, { paddingBottom: bottomInset + space.xl + (snap === 'full' ? 56 : 0) }]}
            showsVerticalScrollIndicator={false}>
            <View style={styles.listInner}>{children}</View>
          </Animated.ScrollView>
        </View>
      </Animated.View>

      {snap === 'full' && (
        <Pressable style={[styles.mapButton, { bottom: bottomInset + space.lg }]} onPress={() => onSnapChange('collapsed')} accessibilityRole="button">
          <Text style={styles.mapButtonText}>Mapa</Text>
          <Ionicons name="map" size={18} color={colors.inverseFg} />
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0 },
  floating: { position: 'absolute', top: -64, left: 0, right: 0, paddingHorizontal: space.lg, alignItems: 'flex-end' },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow,
  },
  header: { paddingTop: space.sm, paddingBottom: space.md, paddingHorizontal: space.lg, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.sm },
  title: { fontSize: font.size.md, fontWeight: '800', color: colors.ink, fontFamily: font.family, textAlign: 'center' },
  subtitle: { fontSize: font.size.xs, color: colors.inkSoft, fontFamily: font.family, textAlign: 'center', marginTop: 1 },
  list: { paddingHorizontal: space.lg, alignItems: 'center' },
  listInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.xl },
  mapButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.inverseBg,
    ...shadow,
  },
  mapButtonText: { color: colors.inverseFg, fontWeight: '700', fontSize: font.size.md, fontFamily: font.family },
});
