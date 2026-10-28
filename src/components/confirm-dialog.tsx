import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { AppText, Button } from '@/components/ui';
import { colors, radius, shadow, space } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Diálogo de confirmación propio (Alert.alert con botones no funciona en web). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  icon = 'help-circle',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: IconName;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <FadeIn from={20} duration={220} style={styles.card}>
          <View style={[styles.icon, { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft }]}>
            <Ionicons name={icon} size={28} color={destructive ? colors.danger : colors.primary} />
          </View>
          <AppText variant="heading" style={styles.center}>
            {title}
          </AppText>
          {message && (
            <AppText variant="small" style={styles.center}>
              {message}
            </AppText>
          )}
          <View style={styles.actions}>
            <Button title={cancelLabel} variant="secondary" onPress={onCancel} style={styles.action} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </FadeIn>
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
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    alignItems: 'center',
    ...shadow,
  },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.sm },
  action: { flex: 1, paddingHorizontal: space.md },
});
