import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FadeIn, useMountTransition } from '@/components/motion';
import RestaurantMap, { type MapMarker } from '@/components/restaurant-map';
import { AppText, Button, Chip } from '@/components/ui';
import { useMapFilters } from '@/features/map/filters-store';
import { useApprovedRestaurants } from '@/features/restaurants/queries';
import { useHeaderOffset, useTabBarSpace } from '@/hooks/use-header-offset';
import { DEFAULT_CENTER, useUserLocation, type LatLng } from '@/hooks/use-user-location';
import { isDemo, type Restaurant } from '@/lib/api';
import { CATEGORIES, categoryMeta } from '@/lib/categories';
import { useMenuViewer } from '@/features/menu/menu-store';
import { openDirections } from '@/lib/links';
import { normalize } from '@/lib/text';
import { colors, font, MAX_CONTENT_WIDTH, radius, shadow, space } from '@/theme/tokens';

export default function MapScreen() {
  const headerTop = useHeaderOffset();
  const tabBarSpace = useTabBarSpace();
  const { data: restaurants = [], isLoading, isError, refetch } = useApprovedRestaurants();
  const { search, setSearch, category, setCategory, selectedId, select } = useMapFilters();
  const { location, denied, locate } = useUserLocation();
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [catsMounted, catsAnim] = useMountTransition(catsOpen);
  const activeCategory = category ? categoryMeta(category) : null;

  const visible = useMemo(() => {
    const q = normalize(search);
    return restaurants.filter(
      (r) => (!category || r.category === category) && (!q || normalize(r.name).includes(q)),
    );
  }, [restaurants, search, category]);

  const markers: MapMarker[] = visible.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    category: r.category,
    label: r.name,
  }));

  const selected = restaurants.find((r) => r.id === selectedId) ?? null;
  const showResults = searchFocused && search.length > 0;

  function choose(r: Restaurant) {
    select(r.id);
    setFocus({ latitude: r.latitude, longitude: r.longitude, zoom: 15 });
    setSearchFocused(false);
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
        }}
        userLocation={location}
        focus={focus}
        initialCenter={DEFAULT_CENTER}
        initialZoom={11.5}
      />

      {/* Búsqueda + categorías */}
      <View style={[styles.top, { paddingTop: headerTop }]} pointerEvents="box-none">
        <View style={styles.topInner} pointerEvents="box-none">
          <View style={styles.searchBox}>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}>
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

          <View style={styles.statusRow} pointerEvents="box-none">
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {isLoading ? 'Cargando lugares…' : `${visible.length} ${visible.length === 1 ? 'lugar' : 'lugares'}`}
              </Text>
            </View>
            {activeCategory && !catsOpen && (
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
        </View>
      </View>

      {/* Controles inferiores */}
      <View style={[styles.bottom, { paddingBottom: tabBarSpace + space.md }]} pointerEvents="box-none">
        <View style={styles.bottomInner} pointerEvents="box-none">
          <Pressable style={styles.locate} onPress={centerOnMe} accessibilityLabel="Centrar en mi ubicación">
            <Ionicons name={denied ? 'navigate-circle-outline' : 'navigate'} size={22} color={colors.ink} />
          </Pressable>

          {isError && (
            <View style={styles.sheet}>
              <AppText variant="heading">No pudimos cargar el mapa</AppText>
              <Button title="Reintentar" icon="refresh" onPress={() => refetch()} />
            </View>
          )}

          {selected && (
            <FadeIn key={selected.id} from={40} duration={240}>
              <RestaurantSheet restaurant={selected} onClose={() => select(null)} />
            </FadeIn>
          )}
        </View>
      </View>
    </View>
  );
}

function RestaurantSheet({ restaurant: r, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const meta = categoryMeta(r.category);
  const openMenu = useMenuViewer((s) => s.open);
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <View style={[styles.sheetIcon, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetCategory, { color: meta.color }]}>{meta.name.toUpperCase()}</Text>
          <AppText variant="heading" numberOfLines={2}>
            {r.name}
          </AppText>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      </View>
      {r.address && (
        <View style={styles.sheetRow}>
          <Ionicons name="location-outline" size={16} color={colors.inkSoft} />
          <AppText variant="small" style={{ flex: 1 }}>
            {r.address}
          </AppText>
        </View>
      )}
      <View style={styles.sheetActions}>
        <Button title="Ver menú" icon="restaurant" onPress={() => openMenu({ name: r.name, url: r.menu_url, category: r.category })}
          style={styles.sheetButton} />
        <Button
          title="Cómo llegar"
          icon="navigate-outline"
          variant="secondary"
          onPress={() => openDirections(r.latitude, r.longitude)}
          style={styles.sheetButton}
        />
      </View>
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
    height: 54,
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
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: space.lg, alignItems: 'center' },
  bottomInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.md },
  locate: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, ...shadow },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sheetIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetCategory: { fontSize: font.size.xs, fontWeight: '800', letterSpacing: 0.8, fontFamily: font.family },
  sheetRow: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  sheetActions: { flexDirection: 'row', gap: space.sm },
  sheetButton: { flex: 1, paddingHorizontal: space.md },
});
