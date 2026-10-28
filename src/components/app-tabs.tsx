import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePop } from '@/components/motion';
import { useAuth } from '@/features/auth/auth-provider';
import { usePendingRestaurants } from '@/features/restaurants/queries';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { colors, font, radius, shadow, space } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const native = Platform.OS !== 'web';

// Barra flotante fija: Aportar | MAPA (botón central) | Perfil.
// Vive fuera de las pantallas (TabSlot), así no se mueve al navegar; se esconde con el teclado abierto.
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { data: pending } = usePendingRestaurants(isAdmin);
  const keyboard = useKeyboardVisible();

  const hide = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(hide, { toValue: keyboard ? 1 : 0, duration: 180, useNativeDriver: native }).start();
  }, [keyboard, hide]);

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        {/* asChild mezcla estilos con spread: pasar un objeto, no un array */}
        <Animated.View
          pointerEvents={keyboard ? 'none' : 'auto'}
          style={StyleSheet.flatten([
            styles.bar,
            {
              bottom: Math.max(insets.bottom, space.lg),
              opacity: hide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateY: hide.interpolate({ inputRange: [0, 1], outputRange: [0, 140] }) }],
            },
          ])}>
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
        </Animated.View>
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
  const pop = usePop(!!isFocused);
  return (
    <Pressable {...props} style={styles.side} accessibilityLabel={label}>
      <Animated.View
        style={{
          transform: [
            { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}>
        <Ionicons name={isFocused ? activeIcon : icon} size={24} color={color} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

function MapTab({ isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  const pop = usePop(!!isFocused);
  return (
    <Pressable {...props} style={styles.center} accessibilityLabel="Mapa">
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.mapButton,
            !isFocused && styles.mapButtonIdle,
            { transform: [{ scale: pressed ? 0.94 : pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
          ]}>
          <Ionicons name="map" size={30} color={isFocused ? '#fff' : colors.inverseFg} />
        </Animated.View>
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
    borderWidth: 1,
    borderColor: colors.line,
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
  mapButtonIdle: { backgroundColor: colors.inverseBg },
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
