import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RestaurantStatus } from '@/lib/api';
import { colors, font, MAX_CONTENT_WIDTH, radius, shadow, space, TAB_BAR_SPACE } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: 'title' | 'heading' | 'body' | 'small' | 'label' }) {
  return <Text {...props} style={[styles.text, textVariants[variant], style]} />;
}

/** Pantalla con scroll, ancho máximo centrado y espacio para la barra de tabs. */
export function Screen({ children, tabBar = true }: { children: ReactNode; tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: insets.top + space.xl, paddingBottom: (tabBar ? TAB_BAR_SPACE : space.xl) + insets.bottom },
      ]}>
      <View style={styles.screenInner}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.text, styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  icon,
  ...props
}: TextInputProps & { label?: string; error?: string; icon?: IconName }) {
  return (
    <View style={styles.field}>
      {label && <AppText variant="label">{label}</AppText>}
      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={18} color={colors.inkMuted} />}
        <TextInput placeholderTextColor={colors.inkMuted} {...props} style={[styles.text, styles.input]} />
      </View>
      {error && <AppText style={styles.errorText}>{error}</AppText>}
    </View>
  );
}

export function Chip({
  label,
  icon,
  active,
  color = colors.primary,
  onPress,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active ? { backgroundColor: color, borderColor: color } : null,
        pressed && styles.pressed,
      ]}>
      {icon && <Ionicons name={icon} size={15} color={active ? '#fff' : color} />}
      <Text style={[styles.text, styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const STATUS = {
  pending: { label: 'En revisión', icon: 'time', fg: colors.warning, bg: colors.warningSoft },
  approved: { label: 'Publicado', icon: 'checkmark-circle', fg: colors.success, bg: colors.successSoft },
  rejected: { label: 'Rechazado', icon: 'close-circle', fg: colors.danger, bg: colors.dangerSoft },
} as const;

export function StatusBadge({ status }: { status: RestaurantStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={13} color={s.fg} />
      <Text style={[styles.text, styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
  icon = 'information-circle',
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'success';
  icon?: IconName;
}) {
  const t = {
    info: { bg: colors.warningSoft, fg: colors.warning },
    error: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={18} color={t.fg} />
      <AppText variant="small" style={{ flex: 1, color: colors.ink }}>
        {children}
      </AppText>
    </View>
  );
}

const textVariants = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: '800', letterSpacing: -0.8 },
  heading: { fontSize: font.size.lg, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: font.size.md },
  small: { fontSize: font.size.sm, color: colors.inkSoft },
  label: { fontSize: font.size.sm, fontWeight: '700' },
});

const buttonVariants = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  success: { bg: colors.success, fg: '#fff', border: colors.success },
};

const styles = StyleSheet.create({
  text: { color: colors.ink, fontFamily: font.family },
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { paddingHorizontal: space.lg, alignItems: 'center' },
  screenInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: font.size.md, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  field: { gap: space.xs + 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 48, fontSize: font.size.md },
  errorText: { color: colors.danger, fontSize: font.size.xs, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  chipText: { fontSize: font.size.sm, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: font.size.xs, fontWeight: '700' },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
});
