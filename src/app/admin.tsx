import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import RestaurantMap from '@/components/restaurant-map';
import { AppText, Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { usePendingRestaurants, useReviewRestaurant } from '@/features/restaurants/queries';
import type { PendingRestaurant } from '@/lib/api';
import { categoryMeta } from '@/lib/categories';
import { useMenuViewer } from '@/features/menu/menu-store';
import { useMenuPreview } from '@/features/menu/use-menu-preview';
import { displayUsername, formatDate } from '@/lib/text';
import { colors, radius, space } from '@/theme/tokens';

export default function AdminScreen() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: pending = [], isLoading } = usePendingRestaurants(isAdmin);

  return (
    <Screen tabBar={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/perfil'))}
          style={styles.back}
          accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Moderación</AppText>
          <AppText variant="small">Revisá cada aporte antes de que aparezca en el mapa.</AppText>
        </View>
      </View>

      {authLoading || isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !isAdmin ? (
        <Notice tone="error" icon="lock-closed">
          Esta sección es solo para administradores.
        </Notice>
      ) : pending.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-done-circle" size={40} color={colors.success} />
          <AppText variant="heading">Todo al día</AppText>
          <AppText variant="small">No hay aportes esperando revisión.</AppText>
        </Card>
      ) : (
        pending.map((r) => <ReviewCard key={r.id} restaurant={r} />)
      )}
    </Screen>
  );
}

function ReviewCard({ restaurant: r }: { restaurant: PendingRestaurant }) {
  const review = useReviewRestaurant();
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const meta = categoryMeta(r.category);
  const busy = review.isPending;
  const openMenu = useMenuViewer((s) => s.open);
  const { data: preview, isLoading: checking } = useMenuPreview(r.menu_url);

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={[styles.category, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={13} color="#fff" />
          <AppText style={styles.categoryText}>{meta.name}</AppText>
        </View>
        <AppText variant="small">
          {displayUsername(r.submitter)} · {formatDate(r.created_at)}
        </AppText>
      </View>

      <AppText variant="heading">{r.name}</AppText>
      {r.address && <AppText variant="small">{r.address}</AppText>}

      <LinkCheck checking={checking} status={preview === null ? 'unknown' : preview?.status} httpStatus={preview?.httpStatus} />
      <Pressable onPress={() => openMenu({ name: r.name, url: r.menu_url, category: r.category })} style={styles.link}>
        <Ionicons name="open-outline" size={16} color={colors.primaryDark} />
        <AppText variant="small" style={{ color: colors.primaryDark, flex: 1 }} numberOfLines={1}>
          {r.menu_url}
        </AppText>
      </Pressable>

      <View style={styles.mapBox}>
        <RestaurantMap
          initialCenter={r}
          initialZoom={15}
          markers={[{ id: r.id, latitude: r.latitude, longitude: r.longitude, category: r.category, label: r.name }]}
        />
      </View>

      {review.error && <Notice tone="error">{review.error.message}</Notice>}

      {rejecting ? (
        <>
          <TextField
            label="Motivo del rechazo (lo ve quien aportó)"
            value={note}
            onChangeText={setNote}
            placeholder="Ej: el link no es un menú, ubicación incorrecta…"
            maxLength={300}
          />
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={() => setRejecting(false)} style={{ flex: 1 }} />
            <Button
              title="Rechazar"
              variant="danger"
              icon="close"
              loading={busy}
              onPress={() => review.mutate({ id: r.id, decision: 'rejected', note })}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : (
        <View style={styles.actions}>
          <Button title="Rechazar" variant="danger" icon="close" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
          <Button
            title="Aprobar"
            variant="success"
            icon="checkmark"
            loading={busy}
            onPress={() => review.mutate({ id: r.id, decision: 'approved' })}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </Card>
  );
}

const LINK_STATUS = {
  embeddable: { icon: 'checkmark-circle', color: colors.success, text: 'El menú carga y se puede ver dentro de la app' },
  unverified: { icon: 'help-circle', color: colors.warning, text: 'El sitio no deja verificarlo; abrilo para revisar' },
  blocked: { icon: 'eye-off', color: colors.warning, text: 'El link funciona, pero el sitio no se deja mostrar dentro de la app' },
  broken: { icon: 'close-circle', color: colors.danger, text: 'El link está roto' },
  unreachable: { icon: 'cloud-offline', color: colors.danger, text: 'El sitio no responde' },
  invalid: { icon: 'alert-circle', color: colors.danger, text: 'El link no es válido' },
  unknown: { icon: 'help-circle', color: colors.inkMuted, text: 'No se pudo verificar el link' },
} as const;

function LinkCheck({ checking, status, httpStatus }: { checking: boolean; status?: keyof typeof LINK_STATUS; httpStatus?: number | null }) {
  if (checking) {
    return (
      <View style={styles.check}>
        <ActivityIndicator size="small" color={colors.inkMuted} />
        <AppText variant="small">Verificando el link del menú…</AppText>
      </View>
    );
  }
  const s = LINK_STATUS[status ?? 'unknown'];
  return (
    <View style={styles.check}>
      <Ionicons name={s.icon} size={16} color={s.color} />
      <AppText variant="small" style={{ color: s.color, flex: 1, fontWeight: '600' }}>
        {s.text}
        {status === 'broken' && httpStatus ? ` (error ${httpStatus})` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  mapBox: { height: 180, borderRadius: radius.md, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: space.sm },
});
