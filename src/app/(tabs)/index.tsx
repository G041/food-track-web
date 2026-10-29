import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FadeIn, useMountTransition } from '@/components/motion';
import { NearbySheet } from '@/components/nearby-sheet';
import { RatingDialog } from '@/components/rating-dialog';
import { RestaurantCard } from '@/components/restaurant-card';
import { RestaurantDetailsModal } from '@/components/restaurant-details-modal';
import RestaurantMap, { type MapMarker } from '@/components/restaurant-map';
import { AppText, Button, Chip } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useMapFilters } from '@/features/map/filters-store';
import { useMapSheet } from '@/features/map/sheet-store';
import { useMenuViewer } from '@/features/menu/menu-store';
import {
  useApprovedRestaurants,
  useFavorites,
  useMyRatings,
  useRatingStats,
  useToggleFavorite,
} from '@/features/restaurants/queries';
import { useHeaderOffset, useTabBarSpace } from '@/hooks/use-header-offset';
import { DEFAULT_CENTER, useUserLocation, type LatLng } from '@/hooks/use-user-location';
import { isDemo, type Restaurant } from '@/lib/api';
import { CATEGORIES, categoryMeta } from '@/lib/categories';
import { distanceMeters } from '@/lib/geo';
import { openDirections } from '@/lib/links';
import { normalize } from '@/lib/text';
import { colors, font, MAX_CONTENT_WIDTH, radius, shadow, space } from '@/theme/tokens';

const SEARCH_HEIGHT = 54;

export default function MapScreen() {
  const headerTop = useHeaderOffset();
  const tabBarSpace = useTabBarSpace();
  const { session } = useAuth();
  const { data: restaurants = [], isLoading, isError, refetch } = useApprovedRestaurants();
  const { data: stats = {} } = useRatingStats();
  const { data: myRatings = {} } = useMyRatings(session?.userId);
  const { data: favoriteIds = [] } = useFavorites(session?.userId);
  const toggleFavorite = useToggleFavorite(session?.userId);
  const openMenu = useMenuViewer((s) => s.open);
  const { search, setSearch, category, setCategory, selectedId, select } = useMapFilters();
  const { location, denied, locate } = useUserLocation();

  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | null>(null);
  const [sheetTop, setSheetTop] = useState(0);
  const [searchBounds, setSearchBounds] = useState({ y: 0, height: SEARCH_HEIGHT });
  const [compactIndex, setCompactIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [catsMounted, catsAnim] = useMountTransition(catsOpen);
  const { snap, setSnap } = useMapSheet();
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [ratingFor, setRatingFor] = useState<Restaurant | null>(null);
  const [askLogin, setAskLogin] = useState(false);
  const activeCategory = category ? categoryMeta(category) : null;
  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const detailsRestaurant = restaurants.find((r) => r.id === detailsId);

  const visible = useMemo(() => {
    const q = normalize(search);
    return restaurants.filter(
      (r) =>
        (!category || r.category === category) &&
        (!q || normalize(r.name).includes(q)) &&
        (!onlyFavorites || favorites.has(r.id)),
    );
  }, [restaurants, search, category, onlyFavorites, favorites]);

  // La lista mantiene su orden aunque se abra la ficha de un pin del mapa.
  const nearby = useMemo(() => {
    const withDistance = visible.map((r) => ({ r, d: location ? distanceMeters(location, r) : null }));
    withDistance.sort((a, b) =>
      a.d != null && b.d != null ? a.d - b.d : a.r.name.localeCompare(b.r.name),
    );
    return withDistance;
  }, [visible, location]);

  const nearbyKey = nearby.map(({ r }) => r.id).join(',');
  const compactRestaurant = nearby[Math.min(compactIndex, nearby.length - 1)]?.r;
  const previewFocus = useMemo(() => compactRestaurant ? {
    latitude: compactRestaurant.latitude,
    longitude: compactRestaurant.longitude,
    zoom: 15,
  } : null, [compactRestaurant]);
  useEffect(() => {
    if (snap !== 'half' || !compactRestaurant) return;
    select(compactRestaurant.id);
  }, [snap, compactRestaurant, select, nearbyKey]);

  const markers: MapMarker[] = visible.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    category: r.category,
    label: r.name,
  }));

  const showResults = searchFocused && search.length > 0;
  const count = visible.length;
  const title = isLoading
    ? 'Buscando lugares…'
    : `${count} ${count === 1 ? 'lugar' : 'lugares'}${onlyFavorites ? ' favoritos' : location ? ' cerca tuyo' : ''}`;

  function choose(r: Restaurant) {
    Keyboard.dismiss();
    select(r.id);
    setDetailsId(r.id);
    setFocus({ latitude: r.latitude, longitude: r.longitude, zoom: 15 });
    setSearchFocused(false);
  }

  function locateOnMap(r: Restaurant) {
    select(r.id);
    setFocus({ latitude: r.latitude, longitude: r.longitude, zoom: 16 });
    setSnap('collapsed');
  }

  async function centerOnMe() {
    const coords = location ?? (await locate());
    if (coords) setFocus({ ...coords, zoom: 14 });
  }

  return (
    <View style={styles.container}>
      <RestaurantMap
        markers={markers}
        selectedId={selectedId}
        onMarkerPress={(id) => {
          const r = restaurants.find((x) => x.id === id);
          if (r) choose(r);
        }}
        onMapPress={() => {
          select(null);
          setSearchFocused(false);
          setSnap('collapsed');
        }}
        userLocation={location}
        focus={focus}
        previewFocus={snap === 'half' ? previewFocus : null}
        focusCenterY={snap === 'half' && sheetTop > 0 ? (headerTop + searchBounds.y + searchBounds.height + sheetTop) / 2 : undefined}
        initialCenter={DEFAULT_CENTER}
        initialZoom={11.5}
      />

      {/* Lugares cercanos (estilo Airbnb) */}
      <NearbySheet
        snap={snap}
        onSnapChange={setSnap}
        fullTop={headerTop + SEARCH_HEIGHT + space.lg + (isDemo || activeCategory ? 30 : 0)}
        bottomInset={tabBarSpace}
        scrollKey={nearbyKey}
        onCompactIndexChange={setCompactIndex}
        onTopChange={setSheetTop}
        title={title}
        subtitle={location && !isLoading ? 'Ordenados por distancia' : undefined}
        headerAccessory={
          session ? (
            <Pressable
              onPress={() => setOnlyFavorites((v) => !v)}
              style={[styles.favFilter, onlyFavorites && styles.favFilterOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: onlyFavorites }}
              accessibilityLabel="Mostrar solo favoritos">
              <Ionicons name={onlyFavorites ? 'heart' : 'heart-outline'} size={18} color={onlyFavorites ? '#FF385C' : colors.inkSoft} />
            </Pressable>
          ) : undefined
        }
        floatingOverMap={
          <Pressable style={styles.locate} onPress={centerOnMe} accessibilityLabel="Centrar en mi ubicación">
            <Ionicons name={denied ? 'navigate-circle-outline' : 'navigate'} size={22} color={colors.ink} style={[styles.locateIcon, !denied && styles.locateArrow]} />
          </Pressable>
        }>
        {({ compact, cardHeight }) => isError ? (
          <View style={styles.empty}>
            <AppText variant="heading">No pudimos cargar los lugares</AppText>
            <Button title="Reintentar" icon="refresh" onPress={() => refetch()} />
          </View>
        ) : !isLoading && nearby.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={onlyFavorites ? 'heart-outline' : 'search'} size={32} color={colors.inkMuted} />
            <AppText variant="small" style={{ textAlign: 'center' }}>
              {onlyFavorites
                ? 'Todavía no guardaste favoritos. Tocá el ♥ de una tarjeta para guardarla.'
                : 'No hay lugares con estos filtros.'}
            </AppText>
          </View>
        ) : (
          nearby.map(({ r, d }) => (
            <RestaurantCard
              key={r.id}
              framed
              compactHeight={compact ? cardHeight : undefined}
              restaurant={r}
              distance={d}
              stats={stats[r.id]}
              myRating={myRatings[r.id]}
              favorite={favorites.has(r.id)}
              highlighted={r.id === selectedId}
              onToggleFavorite={() => (session ? toggleFavorite.mutate({ id: r.id, on: !favorites.has(r.id) }) : setAskLogin(true))}
              onLocate={() => locateOnMap(r)}
              onOpenMenu={() => openMenu({ name: r.name, url: r.menu_url, category: r.category })}
              onRate={() => setRatingFor(r)}
              onDirections={() => openDirections(r.latitude, r.longitude)}
            />
          ))
        )}
      </NearbySheet>

      {/* Búsqueda + categorías (por encima del panel) */}
      <View style={[styles.top, { paddingTop: headerTop }]} pointerEvents="box-none">
        <View style={styles.topInner} pointerEvents="box-none">
          <View style={styles.searchBox} onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setSearchBounds({ y, height });
          }}>
            <Ionicons name="search" size={20} color={colors.inkSoft} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              placeholder="Buscá un lugar para comer…"
              placeholderTextColor={colors.inkMuted}
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={20} color={colors.inkMuted} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setCatsOpen((o) => !o)}
              style={[styles.filterButton, (catsOpen || !!category) && { backgroundColor: colors.primarySoft }]}
              accessibilityLabel={catsOpen ? 'Ocultar categorías' : 'Mostrar categorías'}
              accessibilityState={{ expanded: catsOpen }}>
              <Ionicons name="options" size={20} color={catsOpen || category ? colors.primary : colors.inkSoft} />
              {category && !catsOpen && <View style={styles.filterDot} />}
            </Pressable>
          </View>

          {showResults && (
            <FadeIn from={-8} duration={180} style={styles.results}>
              {visible.length === 0 ? (
                <AppText variant="small" style={{ padding: space.md }}>
                  No encontramos lugares con ese nombre.
                </AppText>
              ) : (
                visible.slice(0, 6).map((r) => {
                  const meta = categoryMeta(r.category);
                  return (
                    <Pressable key={r.id} style={styles.resultRow} onPress={() => choose(r)}>
                      <View style={[styles.resultIcon, { backgroundColor: meta.color }]}>
                        <Ionicons name={meta.icon} size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontWeight: '700' }} numberOfLines={1}>
                          {r.name}
                        </AppText>
                        <AppText variant="small" numberOfLines={1}>
                          {meta.name}
                          {r.address ? ` · ${r.address}` : ''}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </FadeIn>
          )}

          {catsMounted && (
            <Animated.View
              style={{
                opacity: catsAnim,
                transform: [{ translateY: catsAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
              }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
                <Chip
                  label="Todos"
                  icon="apps"
                  active={!category}
                  color={colors.inverseBg}
                  activeTextColor={colors.inverseFg}
                  onPress={() => {
                    setCategory(null);
                    setCatsOpen(false);
                  }}
                />
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.slug}
                    label={c.name}
                    icon={c.icon}
                    color={c.color}
                    active={category === c.slug}
                    onPress={() => {
                      setCategory(category === c.slug ? null : c.slug);
                      setCatsOpen(false);
                    }}
                  />
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {(activeCategory || isDemo) && !catsOpen && (
            <View style={styles.statusRow} pointerEvents="box-none">
              {activeCategory && (
                <Pressable
                  onPress={() => setCategory(null)}
                  style={[styles.pill, styles.pillRow, { backgroundColor: activeCategory.color }]}
                  accessibilityLabel={`Quitar filtro ${activeCategory.name}`}>
                  <Ionicons name={activeCategory.icon} size={12} color="#fff" />
                  <Text style={[styles.pillText, { color: '#fff' }]}>{activeCategory.name}</Text>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              )}
              {isDemo && (
                <View style={[styles.pill, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.pillText, { color: '#1E1A16' }]}>Modo demo</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {detailsRestaurant && (
        <RestaurantDetailsModal
          key={detailsRestaurant.id}
          restaurant={detailsRestaurant}
          distance={location ? distanceMeters(location, detailsRestaurant) : null}
          stats={stats[detailsRestaurant.id]}
          myRating={myRatings[detailsRestaurant.id]}
          favorite={favorites.has(detailsRestaurant.id)}
          onClose={() => setDetailsId(null)}
          onToggleFavorite={() => {
            if (session) {
              toggleFavorite.mutate({ id: detailsRestaurant.id, on: !favorites.has(detailsRestaurant.id) });
            } else {
              setDetailsId(null);
              setAskLogin(true);
            }
          }}
          onOpenMenu={() => {
            setDetailsId(null);
            openMenu({ name: detailsRestaurant.name, url: detailsRestaurant.menu_url, category: detailsRestaurant.category });
          }}
          onRate={() => {
            setDetailsId(null);
            setRatingFor(detailsRestaurant);
          }}
          onDirections={() => openDirections(detailsRestaurant.latitude, detailsRestaurant.longitude)}
        />
      )}

      <RatingDialog
        restaurant={ratingFor}
        stats={ratingFor ? stats[ratingFor.id] : undefined}
        current={ratingFor ? myRatings[ratingFor.id] : undefined}
        onClose={() => setRatingFor(null)}
      />
      <ConfirmDialog
        visible={askLogin}
        icon="heart-outline"
        title="Guardá tus lugares favoritos"
        message="Ingresá con tu cuenta para guardar favoritos y encontrarlos rápido."
        confirmLabel="Ingresar"
        onCancel={() => setAskLogin(false)}
        onConfirm={() => {
          setAskLogin(false);
          router.navigate('/perfil');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, alignItems: 'center' },
  topInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: SEARCH_HEIGHT,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadow,
  },
  searchInput: { flex: 1, height: '100%', fontSize: font.size.md, color: colors.ink, fontFamily: font.family },
  results: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: space.xs, ...shadow },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  resultIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { marginHorizontal: -space.lg, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
  statusRow: { flexDirection: 'row', gap: space.sm },
  filterButton: {
    width: 38,
    height: 38,
    marginRight: -space.sm,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pill: {
    backgroundColor: colors.inverseBg,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: { color: colors.inverseFg, fontSize: font.size.xs, fontWeight: '700', fontFamily: font.family },
  locate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  locateIcon: {
    width: 22,
    height: 22,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  // Balance the diagonal arrow's visual weight inside the circular button.
  locateArrow: { transform: [{ translateX: -2 }, { translateY: 2 }] },
  favFilter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterOn: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
});
