import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RestaurantCard } from '@/components/restaurant-card';
import { AppText } from '@/components/ui';
import { useHeaderOffset, useTabBarBottom } from '@/hooks/use-header-offset';
import { colors, radius, shadow, space } from '@/theme/tokens';

type Props = Omit<ComponentProps<typeof RestaurantCard>, 'highlighted' | 'onLocate'> & {
  onClose: () => void;
};

/** Ficha independiente sobre el mapa, la lista de cercanos y la navegación. */
export function RestaurantDetailsModal({ onClose, ...cardProps }: Props) {
  const top = useHeaderOffset();
  const bottom = useTabBarBottom();

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: top, paddingBottom: bottom + space.lg }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View style={styles.dialog} accessibilityViewIsModal accessibilityLabel={`Ficha de ${cardProps.restaurant.name}`}>
          <View style={styles.header}>
            <AppText variant="heading" style={styles.title}>Detalle del lugar</AppText>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ficha del restaurante">
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <RestaurantCard {...cardProps} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.sm, marginBottom: space.sm },
  title: { flex: 1 },
  close: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceAlt },
  content: { flexGrow: 0, flexShrink: 1 },
});
