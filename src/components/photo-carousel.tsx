import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Fotos que se pasan de costado (paginado) con puntitos indicadores, como en Airbnb. */
export function PhotoCarousel({ slides, height, showIndicators = true, onIndexChange }: {
  slides: ReactNode[];
  height: number;
  showIndicators?: boolean;
  onIndexChange?: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const slideHeight = Math.max(0, height);

  return (
    <View style={{ height, overflow: 'hidden' }} onLayout={(e) => {
      setWidth(e.nativeEvent.layout.width);
      onIndexChange?.(index);
    }}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          style={{ height: slideHeight, flexGrow: 0, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const i = Math.max(0, Math.min(slides.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
            if (i !== index) {
              setIndex(i);
              onIndexChange?.(i);
            }
          }}>
          {slides.map((slide, i) => (
            <View key={i} style={{ width, height: slideHeight }}>
              {slide}
            </View>
          ))}
        </ScrollView>
      )}
      {showIndicators && <PhotoPagination count={slides.length} index={index} />}
    </View>
  );
}

/** Render separately from the scroller in layouts with nested scrolling. */
export function PhotoPagination({ count, index, insetRight = 0 }: { count: number; index: number; insetRight?: number }) {
  if (count <= 1) return null;
  return (
    <View style={[styles.dots, { right: insetRight }]} pointerEvents="none" accessibilityLabel={`Imagen ${index + 1} de ${count}`}>
      <View style={styles.dotTrack}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', bottom: 10, left: 0, zIndex: 5, alignItems: 'center' },
  dotTrack: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.65)' },
  dotActive: { backgroundColor: '#fff', transform: [{ scale: 1.2 }] },
});
