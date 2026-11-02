import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { HoldToDeleteButton } from '@/components/hold-to-delete';
import { FadeIn } from '@/components/motion';
import { AppText, Button, Notice } from '@/components/ui';
import { colors, radius, shadow, space } from '@/theme/tokens';

/**
 * Confirmación de un borrado que no se puede deshacer: "Cancelar" y "Eliminar", donde "Eliminar"
 * hay que mantenerlo apretado `seconds` segundos mientras una barra roja lo va llenando.
 * `inline` lo dibuja sobre el contenedor actual (útil dentro de otro modal) en vez de abrir un Modal.
 */
export function HoldConfirmDialog({
  visible,
  title,
  message,
  seconds,
  busy,
  error,
  inline,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  seconds: number;
  busy?: boolean;
  error?: string | null;
  inline?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [hint, setHint] = useState<'holding' | 'early' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function remindHold() {
    setHint('early');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(null), 2500);
  }

  function cancel() {
    if (busy) return;
    setHint(null);
    onCancel();
  }

  if (!visible) return null;

  const content = (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessibilityLabel="Cancelar" />
      <FadeIn from={20} duration={220} style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="trash" size={28} color={colors.danger} />
        </View>
        <AppText variant="heading" style={styles.center}>
          {title}
        </AppText>
        {message && (
          <AppText variant="small" style={styles.center}>
            {message}
          </AppText>
        )}
        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : (
          <AppText variant="small" style={[styles.hint, hint === 'holding' && { color: colors.danger }]}>
            {busy ? 'Eliminando…' : hint === 'holding' ? 'Seguí apretando…' : `Mantené apretado "Eliminar" ${seconds} segundos.`}
          </AppText>
        )}
        <View style={styles.buttons}>
          <Button title="Cancelar" variant="secondary" disabled={busy} onPress={cancel} style={{ flex: 1 }} />
          <HoldToDeleteButton
            seconds={seconds}
            label="Eliminar"
            style={{ flex: 1 }}
            busy={busy}
            accessibilityLabel="Eliminar"
            onHoldChange={(holding) => setHint(holding ? 'holding' : null)}
            onEarlyRelease={remindHold}
            onConfirm={onConfirm}
          />
        </View>
      </FadeIn>
    </View>
  );

  if (inline) return content;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'stretch',
    ...shadow,
  },
  icon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  hint: { textAlign: 'center', fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: space.sm },
});
