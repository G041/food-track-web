import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { usePendingRestaurants } from '@/features/restaurants/queries';
import { colors, font, radius, shadow, space } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Barra flotante: Aportar | MAPA (botón central) | Perfil
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { data: pending } = usePendingRestaurants(isAdmin);

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        {/* asChild mezcla estilos con spread: pasar un objeto, no un array */}
        <View style={StyleSheet.flatten([styles.bar, { bottom: Math.max(insets.bottom, space.lg) }])}>
          <TabTrigger name="aportar" href="/aportar" asChild>
            <SideTab icon="add-circle-outline" activeIcon="add-circle" label="Aportar" />
          </TabTrigger>
          <TabTrigger name="mapa" href="/" asChild>
            <MapTab />
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <SideTab
              icon="person-outline"
              activeIcon="person"
              label="Perfil"
              badge={isAdmin && pending?.length ? pending.length : undefined}
            />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function SideTab({
  icon,
  activeIcon,
  label,
  badge,
  isFocused,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName; activeIcon: IconName; label: string; badge?: number }) {
  const color = isFocused ? colors.primary : colors.inkSoft;
  return (
    <Pressable {...props} style={styles.side} accessibilityLabel={label}>
      <View>
        <Ionicons name={isFocused ? activeIcon : icon} size={24} color={color} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

function MapTab({ isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={styles.center} accessibilityLabel="Mapa">
      {({ pressed }) => (
        <View style={[styles.mapButton, !isFocused && styles.mapButtonIdle, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Ionicons name="map" size={30} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    width: '92%',
    maxWidth: 420,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    ...shadow,
  },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  label: { fontSize: font.size.xs, fontWeight: '700', fontFamily: font.family },
  center: { width: 96, alignItems: 'center' },
  mapButton: {
    width: 76,
    height: 76,
    marginTop: -34,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.bg,
    ...shadow,
  },
  mapButtonIdle: { backgroundColor: colors.ink },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
