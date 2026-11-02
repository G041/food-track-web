import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { AppText, Button, Chip, Notice, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useReportRestaurant } from '@/features/restaurants/queries';
import type { ReportReason, Restaurant } from '@/lib/api';
import { colors, radius, shadow, space } from '@/theme/tokens';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'menu_roto', label: 'El menú no abre' },
  { value: 'cerrado', label: 'Cerró' },
  { value: 'datos_incorrectos', label: 'Datos o ubicación mal' },
  { value: 'inapropiado', label: 'Contenido inapropiado' },
  { value: 'otro', label: 'Otro' },
];

export const reportReasonLabel = (reason: ReportReason) => REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

/** Reportar un lugar publicado (lo revisa un admin). */
export function ReportDialog({ restaurant, onClose }: { restaurant: Restaurant | null; onClose: () => void }) {
  return (
    <Modal visible={!!restaurant} transparent animationType="fade" onRequestClose={onClose}>
      {restaurant && <Content key={restaurant.id} restaurant={restaurant} onClose={onClose} />}
    </Modal>
  );
}

function Content({ restaurant: r, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const { session } = useAuth();
  const report = useReportRestaurant();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
      <FadeIn from={20} duration={220} style={styles.card}>
        <AppText variant="heading" style={styles.center}>
          Reportar {r.name}
        </AppText>

        {report.isSuccess ? (
          <>
            <Notice tone="success" icon="checkmark-circle">
              ¡Gracias! Un moderador lo va a revisar.
            </Notice>
            <Button title="Listo" onPress={onClose} />
          </>
        ) : !session ? (
          <>
            <Notice icon="person-circle-outline">Ingresá con tu cuenta para reportar un lugar.</Notice>
            <Button
              title="Ingresar"
              icon="person"
              onPress={() => {
                onClose();
                router.navigate('/perfil');
              }}
            />
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
          </>
        ) : (
          <>
            <AppText variant="small" style={styles.center}>
              ¿Qué pasa con este lugar?
            </AppText>
            <View style={styles.reasons}>
              {REPORT_REASONS.map((o) => (
                <Chip key={o.value} label={o.label} active={reason === o.value} onPress={() => setReason(o.value)} />
              ))}
            </View>
            <TextField
              label="Detalle (opcional)"
              value={detail}
              onChangeText={setDetail}
              maxLength={300}
              placeholder="Contanos qué viste"
            />
            {report.error && <Notice tone="error">{report.error.message}</Notice>}
            <Button
              title="Enviar reporte"
              icon="flag"
              variant="danger"
              disabled={!reason}
              loading={report.isPending}
              onPress={() => reason && report.mutate({ id: r.id, reason, detail })}
            />
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
          </>
        )}
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
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
});
