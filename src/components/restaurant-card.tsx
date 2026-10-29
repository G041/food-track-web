import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ART_VARIANTS, CategoryArt } from '@/components/category-art';
import { PhotoCarousel, PhotoPagination } from '@/components/photo-carousel';
import { AppText, Button } from '@/components/ui';
import type { RatingStats, Restaurant } from '@/lib/api';
import { categoryMeta } from '@/lib/categories';
import { formatDistance } from '@/lib/geo';
import { colors, font, radius, space } from '@/theme/tokens';

const PHOTO_HEIGHT = 210;
const COMPACT_ACTION_WIDTH = 52;

export function formatRating(stats?: RatingStats) {
  if (!stats || stats.count === 0) return null;
  const avg = stats.average.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${avg} (${stats.count})`;
}

/** Tarjeta de restaurante estilo Airbnb: fotos deslizables, favorito, mini-mapa, estrellas y menú. */
export function RestaurantCard({
  restaurant: r,
  distance,
  stats,
  myRating,
  favorite,
  framed = false,
  compactHeight,
  highlighted,
  onToggleFavorite,
  onLocate,
  onOpenMenu,
  onRate,
  onDirections,
}: {
  restaurant: Restaurant;
  distance: number | null;
  stats?: RatingStats;
  myRating?: number;
  favorite: boolean;
  framed?: boolean;
  compactHeight?: number;
  highlighted?: boolean;
  onToggleFavorite: () => void;
  onLocate?: () => void;
  onOpenMenu: () => void;
  onRate: () => void;
  onDirections: () => void;
}) {
  const meta = categoryMeta(r.category);
  const rating = formatRating(stats);
  const [compactImageIndex, setCompactImageIndex] = useState(0);

  if (compactHeight != null) {
    const imageHeight = Math.max(0, compactHeight - 4 - space.sm * 3 - 44);
    return (
      <View style={[styles.compactCard, { height: compactHeight }, highlighted && { borderColor: colors.primary }]}>
        <View style={[styles.compactPhotoRow, { height: imageHeight }]}>
          <View style={styles.compactPhoto}>
            <PhotoCarousel
              height={imageHeight}
              showIndicators={false}
              onIndexChange={setCompactImageIndex}
              slides={Array.from({ length: ART_VARIANTS }, (_, i) => (
                <CategoryArt key={i} category={r.category} variant={i} seed={r.id} />
              ))}
            />
          </View>
          <View style={[styles.compactActions, { height: imageHeight }]}>
            <Pressable onPress={onOpenMenu} style={[styles.compactActionButton, styles.compactMenuButton]} accessibilityRole="button" accessibilityLabel="Ver menú">
              <Ionicons name="restaurant" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={onRate} style={styles.compactActionButton} accessibilityRole="button" accessibilityLabel={myRating ? `Calificar: tu nota actual es ${myRating}` : 'Calificar'}>
              <Ionicons name="star-outline" size={24} color={colors.ink} />
            </Pressable>
            <Pressable onPress={onDirections} style={[styles.iconButton, styles.compactDirectionsButton]} accessibilityRole="button" accessibilityLabel="Cómo llegar">
              <Ionicons name="navigate-outline" size={20} color={colors.ink} style={styles.directionsIcon} />
            </Pressable>
          </View>
          <PhotoPagination count={ART_VARIANTS} index={compactImageIndex} insetRight={COMPACT_ACTION_WIDTH + space.sm} />
        </View>
        <View style={styles.compactFooter}>
            <View style={styles.compactInfo}>
              <AppText style={styles.compactName} numberOfLines={1}>{r.name}</AppText>
              <AppText variant="small" style={styles.compactMeta} numberOfLines={1}>
                <AppText variant="small" style={{ color: meta.color, fontWeight: '700' }}>{meta.name}</AppText>
                {distance != null ? ` · a ${formatDistance(distance)}` : ''}
              </AppText>
            </View>
            <Pressable
              onPress={onToggleFavorite}
              style={styles.compactFavorite}
              accessibilityRole="button"
              accessibilityState={{ selected: favorite }}
              accessibilityLabel={favorite ? `Quitar ${r.name} de favoritos` : `Guardar ${r.name} en favoritos`}>
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? '#FF385C' : colors.ink} />
            </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, framed && styles.framed, highlighted && styles.highlighted]}>
      <View style={styles.photo}>
        <PhotoCarousel
          height={PHOTO_HEIGHT}
          slides={Array.from({ length: ART_VARIANTS }, (_, i) => (
            <CategoryArt key={i} category={r.category} variant={i} seed={r.id} />
          ))}
        />
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={8}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityState={{ selected: favorite }}
          accessibilityLabel={favorite ? `Quitar ${r.name} de favoritos` : `Guardar ${r.name} en favoritos`}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#FF385C' : '#fff'} />
        </Pressable>
        {onLocate && (
          <Pressable onPress={onLocate} style={styles.miniMap} accessibilityRole="button" accessibilityLabel={`Ir a ${r.name} en el mapa`}>
            <AppText style={styles.miniMapLabel}>Ir</AppText>
          </Pressable>
        )}
      </View>

      <View style={[styles.body, framed && styles.framedBody]}>
        <View style={styles.titleRow}>
          <AppText style={styles.name} numberOfLines={1}>
            {r.name}
          </AppText>
          <Pressable onPress={onRate} hitSlop={6} style={styles.rating} accessibilityLabel="Calificar">
            <Ionicons name="star" size={14} color={colors.ink} />
            <AppText style={styles.ratingText}>{rating ?? 'Nuevo'}</AppText>
          </Pressable>
        </View>
        <AppText variant="small" numberOfLines={1}>
          <AppText variant="small" style={{ color: meta.color, fontWeight: '700' }}>
            {meta.name}
          </AppText>
          {distance != null ? ` · a ${formatDistance(distance)}` : ''}
        </AppText>
        {r.address && (
          <AppText variant="small" numberOfLines={1} style={{ color: colors.inkMuted }}>
            {r.address}
          </AppText>
        )}
        <View style={styles.actions}>
          <Button title="Ver menú" icon="restaurant" onPress={onOpenMenu} style={styles.menuButton} />
          <Button
            title={myRating ? `Tu nota: ${myRating}★` : 'Calificar'}
            icon={myRating ? undefined : 'star-outline'}
            variant="secondary"
            onPress={onRate}
            style={styles.rateButton}
          />
          <Pressable onPress={onDirections} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Cómo llegar">
            <Ionicons name="navigate-outline" size={20} color={colors.ink} style={styles.directionsIcon} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactCard: { borderRadius: radius.lg, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surfaceAlt, padding: space.sm, gap: space.sm },
  compactPhotoRow: { flexDirection: 'row', gap: space.sm },
  compactPhoto: { flex: 1, minWidth: 0, borderRadius: radius.md, overflow: 'hidden' },
  compactFooter: { height: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  compactInfo: { flex: 1, gap: 2, minWidth: 0 },
  compactName: { fontSize: font.size.md + 1, fontWeight: '700', textAlign: 'center' },
  compactMeta: { textAlign: 'center' },
  compactFavorite: { width: COMPACT_ACTION_WIDTH, height: 44, alignItems: 'center', justifyContent: 'center' },
  compactActions: { width: COMPACT_ACTION_WIDTH, gap: space.sm },
  compactActionButton: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  compactDirectionsButton: { width: COMPACT_ACTION_WIDTH },
  compactMenuButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  card: { gap: space.sm, borderRadius: radius.lg, padding: 2 },
  framed: { backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.line, padding: 0 },
  highlighted: { borderWidth: 2, borderColor: colors.primary, padding: 0 },
  photo: { borderRadius: radius.lg - 2, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  heart: { position: 'absolute', top: 12, right: 12, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' } as never,
  miniMap: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMapLabel: { color: '#1E1A16', fontSize: font.size.sm, fontWeight: '700' },
  body: { gap: 2 },
  framedBody: { paddingBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1, fontSize: font.size.md + 1, fontWeight: '700' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: font.size.sm, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  menuButton: { flex: 1, minHeight: 44, paddingHorizontal: space.md },
  rateButton: { minHeight: 44, paddingHorizontal: space.md },
  iconButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsIcon: {
    width: 20,
    height: 20,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
    // Compensa el peso visual de la punta diagonal, arriba y a la derecha.
    transform: [{ translateX: -2 }, { translateY: 2 }],
  },
});
