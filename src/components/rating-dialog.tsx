import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { formatRating } from '@/components/restaurant-card';
import { AppText, Button, Notice } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useRate } from '@/features/restaurants/queries';
import type { RatingStats, Restaurant } from '@/lib/api';
import { colors, radius, shadow, space } from '@/theme/tokens';

const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

/** Calificar un lugar de 1 a 5 estrellas (una vez por usuario, editable). */
export function RatingDialog({
  restaurant,
  stats,
  current,
  onClose,
}: {
  restaurant: Restaurant | null;
  stats?: RatingStats;
  current?: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!restaurant} transparent animationType="fade" onRequestClose={onClose}>
      {restaurant && <Content key={restaurant.id} restaurant={restaurant} stats={stats} current={current} onClose={onClose} />}
    </Modal>
  );
}

function Content({
  restaurant: r,
  stats,
  current,
  onClose,
}: {
  restaurant: Restaurant;
  stats?: RatingStats;
  current?: number;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const rate = useRate();
  const [stars, setStars] = useState(current ?? 0);
  const summary = formatRating(stats);

  const save = (value: number | null) => rate.mutate({ id: r.id, stars: value }, { onSuccess: onClose });

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
      <FadeIn from={20} duration={220} style={styles.card}>
        <AppText variant="heading" style={styles.center}>
          ¿Qué te pareció {r.name}?
        </AppText>
        <AppText variant="small" style={styles.center}>
          {summary ? `★ ${summary} de la comunidad` : 'Todavía nadie lo calificó. ¡Sé el primero!'}
        </AppText>

        {!session ? (
          <>
            <Notice icon="person-circle-outline">Ingresá con tu cuenta para calificar lugares.</Notice>
            <Button
              title="Ingresar"
              icon="person"
              onPress={() => {
                onClose();
                router.navigate('/perfil');
              }}
            />
          </>
        ) : (
          <>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setStars(n)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} estrella${n > 1 ? 's' : ''}`}>
                  <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={40} color={n <= stars ? colors.accent : colors.inkMuted} />
                </Pressable>
              ))}
            </View>
            <AppText variant="label" style={[styles.center, { minHeight: 20 }]}>
              {LABELS[stars]}
            </AppText>
            {rate.error && <Notice tone="error">{rate.error.message}</Notice>}
            <Button title="Guardar" icon="checkmark" disabled={!stars} loading={rate.isPending} onPress={() => save(stars)} />
            {current ? <Button title="Quitar mi calificación" variant="ghost" onPress={() => save(null)} /> : null}
          </>
        )}
        <Button title="Cancelar" variant="secondary" onPress={onClose} />
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    ...shadow,
  },
  center: { textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
