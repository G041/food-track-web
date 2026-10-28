import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Fotos que se pasan de costado (paginado) con puntitos indicadores, como en Airbnb. */
export function PhotoCarousel({ slides, height }: { slides: ReactNode[]; height: number }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== index) setIndex(i);
          }}>
          {slides.map((slide, i) => (
            <View key={i} style={{ width, height }}>
              {slide}
            </View>
          ))}
        </ScrollView>
      )}
      {slides.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#fff', transform: [{ scale: 1.2 }] },
});
