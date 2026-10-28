import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { CategorySlug } from '@/lib/api';
import { categoryMeta } from '@/lib/categories';
import { font } from '@/theme/tokens';

/** Mezcla un color hex con blanco (amount > 0) o negro (amount < 0). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix(n >> 16);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `rgb(${r}, ${g}, ${b})`;
}

export const ART_VARIANTS = 3;

/**
 * Ilustración provisoria por categoría, en lugar de fotos reales (que todavía no existen).
 * Hay 3 variantes para que el carrusel tenga algo que deslizar; `seed` varía el encuadre por lugar.
 */
export function CategoryArt({ category, variant, seed = 0 }: { category: CategorySlug; variant: number; seed?: number }) {
  const meta = categoryMeta(category);
  const base = meta.color;
  const offset = (seed * 37) % 60;

  if (variant % ART_VARIANTS === 0) {
    return (
      <View style={[styles.fill, { backgroundColor: base }]}>
        <View style={[styles.circle, { width: 260, height: 260, top: -80 + offset / 2, right: -70, backgroundColor: shade(base, 0.18) }]} />
        <View style={[styles.circle, { width: 180, height: 180, bottom: -70, left: -40 + offset, backgroundColor: shade(base, -0.15) }]} />
        <Ionicons name={meta.icon} size={84} color="rgba(255,255,255,0.95)" />
      </View>
    );
  }

  if (variant % ART_VARIANTS === 1) {
    return (
      <View style={[styles.fill, { backgroundColor: shade(base, -0.25) }]}>
        <View style={styles.pattern}>
          {Array.from({ length: 24 }, (_, i) => (
            <Ionicons key={i} name={meta.icon} size={26} color="rgba(255,255,255,0.12)" style={styles.patternIcon} />
          ))}
        </View>
        <View style={[styles.badge, { backgroundColor: base }]}>
          <Ionicons name={meta.icon} size={52} color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: shade(base, 0.82) }]}>
      <View style={[styles.circle, { width: 220, height: 220, left: -60 + offset, top: -60, backgroundColor: shade(base, 0.65) }]} />
      <Ionicons name={meta.icon} size={64} color={base} />
      <Text style={[styles.label, { color: shade(base, -0.35) }]}>{meta.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999 },
  pattern: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }, { scale: 1.3 }],
  },
  patternIcon: { margin: 10 },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)' },
  label: { marginTop: 6, fontSize: font.size.md, fontWeight: '800', fontFamily: font.family, letterSpacing: 0.5 },
});
