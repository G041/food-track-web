import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type ViewStyle,
} from 'react-native';

import type { SheetSnap } from '@/features/map/sheet-store';
import { colors, font, MAX_CONTENT_WIDTH, radius, shadow, space } from '@/theme/tokens';

// Cabecera visible al plegar el panel, con una separación compacta sobre las tabs.
const HANDLE_AREA = 72;
const COLLAPSED_NAV_GAP = 12;
// Keep room for three 44pt action targets, the photo footer and card padding.
const MIN_COMPACT_CARD_HEIGHT = 220;
const COMPACT_HEADER_HEIGHT = 33;
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
  onCompactIndexChange,
  onTopChange,
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
  onCompactIndexChange?: (index: number) => void;
  /** Top edge of the snapped sheet, relative to its map container. */
  onTopChange?: (top: number) => void;
  children: (layout: { compact: boolean; cardHeight: number }) => ReactNode;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(29);
  const compact = snap === 'half';
  // En iOS instalada, visualViewport (y useWindowDimensions en web) puede excluir zonas
  // del sistema. El panel debe llegar al borde real de su contenedor, igual que las tabs.
  const sheetHeight = measuredHeight ?? Math.max(0, windowHeight - fullTop);

  const positions = useMemo(() => {
    const collapsed = Math.max(0, sheetHeight - (bottomInset + COLLAPSED_NAV_GAP + HANDLE_AREA));
    const halfVisibleHeight = Math.max(
      Math.round((sheetHeight + fullTop) * 0.5),
      MIN_COMPACT_CARD_HEIGHT + COMPACT_HEADER_HEIGHT + bottomInset + 22 + space.xs * 2,
    );
    const half = Math.min(collapsed, Math.max(0, sheetHeight - halfVisibleHeight));
    return { full: 0, half, collapsed } as Record<SheetSnap, number>;
  }, [sheetHeight, bottomInset, fullTop]);

  useEffect(() => {
    onTopChange?.(fullTop + positions[snap]);
  }, [fullTop, positions, snap, onTopChange]);

  // Leave room for the raised central map button as well as the tab bar.
  const compactHeight = Math.max(0, sheetHeight - positions.half - headerHeight - bottomInset - 22 - space.xs);

  const [y] = useState(() => new Animated.Value(positions[snap]));
  const current = useRef(positions[snap]);
  const start = useRef(0);
  const latest = useRef({ positions, snap, onSnapChange });
  useEffect(() => {
    latest.current = { positions, snap, onSnapChange };
  });
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
  }, [compact, compactHeight, scrollKey]);

  useEffect(() => {
    const id = y.addListener(({ value }) => (current.current = value));
    return () => y.removeListener(id);
  }, [y]);

  useEffect(() => {
    Animated.spring(y, { toValue: positions[snap], useNativeDriver: native, bounciness: 2, speed: 14 }).start();
  }, [snap, positions, y]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (compact) onCompactIndexChange?.(0);
  }, [scrollKey, compact, onCompactIndexChange]);

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
        onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
        style={[styles.sheet, { top: fullTop, bottom: 0, transform: [{ translateY: y }] }]}>
        {floatingOverMap && (
          <Animated.View pointerEvents={snap === 'full' ? 'none' : 'box-none'} style={[styles.floating, { opacity: floatingOpacity }]}>
            {floatingOverMap}
          </Animated.View>
        )}
        <View style={styles.panel}>
          <View
            {...responder.panHandlers}
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
            style={[styles.header, Platform.OS === 'web' && ({ touchAction: 'none', cursor: 'grab' } as unknown as ViewStyle)]}
            accessibilityRole="adjustable"
            accessibilityLabel="Panel de lugares cercanos: arrastrá para abrir o cerrar">
            <View style={styles.handle} />
            {!compact && (
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {headerAccessory}
              </View>
            )}
          </View>
          <Animated.ScrollView
            ref={scrollRef}
            style={[{ opacity: listOpacity }, compact && { height: compactHeight, flexGrow: 0, flexShrink: 0 }]}
            scrollEnabled={snap !== 'collapsed'}
            pagingEnabled={compact}
            directionalLockEnabled
            nestedScrollEnabled
            decelerationRate={compact ? 'fast' : 'normal'}
            scrollEventThrottle={32}
            onScroll={(event) => {
              if (!compact || compactHeight <= 0) return;
              const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.y / compactHeight));
              if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
              // Wait for touch momentum / CSS scroll snapping to settle before moving the map.
              scrollEndTimer.current = setTimeout(() => onCompactIndexChange?.(index), 150);
            }}
            contentContainerStyle={[styles.list, { gap: compact ? 0 : space.xl, paddingBottom: compact ? 0 : bottomInset + space.xl }]}
            showsVerticalScrollIndicator={false}>
            {Children.map(children({ compact, cardHeight: compactHeight - space.xs }), (child) => (
              <View style={[styles.listInner, compact && { height: compactHeight, paddingBottom: space.xs }]}>{child}</View>
            ))}
          </Animated.ScrollView>
        </View>
      </Animated.View>
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
  list: { paddingHorizontal: space.lg, alignItems: 'stretch' },
  listInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
