import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useMenuViewer, type MenuTarget } from '@/features/menu/menu-store';
import { useMenuPreview, type MenuPreview } from '@/features/menu/use-menu-preview';
import { categoryMeta } from '@/lib/categories';
import { openMenu } from '@/lib/links';
import { colors, font, radius, shadow, space } from '@/theme/tokens';

import MenuFrame from './menu-frame';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SLOW_MS = 15_000;
const WIDE = 768;

/** Modal global con la vista previa del menú. Se abre con useMenuViewer().open(...). */
export default function MenuModal() {
  const { target, close } = useMenuViewer();
  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
      {target && <MenuSheet key={target.url} target={target} onClose={close} />}
    </Modal>
  );
}

type Phase = 'checking' | 'loading' | 'loaded' | 'slow' | 'blocked' | 'broken' | 'unreachable' | 'invalid';

function MenuSheet({ target, onClose }: { target: MenuTarget; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { data: preview, isLoading } = useMenuPreview(target.url);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  // null = no hay verificador disponible: se intenta mostrar el link original.
  const showFrame = !isLoading && (!preview || preview.status === 'embeddable' || preview.status === 'unverified');
  const verified = preview?.status === 'embeddable';

  useEffect(() => {
    if (!showFrame || loaded) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [showFrame, loaded]);

  const phase: Phase = isLoading
    ? 'checking'
    : !showFrame
      ? (preview!.status as Phase)
      : loaded
        ? 'loaded'
        : slow
          ? 'slow'
          : 'loading';

  const meta = categoryMeta(target.category);
  const host = safeHost(preview?.finalUrl ?? target.url);
  const src = frameSrc(target.url, preview, wide);

  return (
    <View style={[styles.backdrop, wide && styles.backdropWide]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar menú" />
      <View style={[styles.sheet, wide ? styles.sheetWide : { marginTop: insets.top + space.lg }]}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" numberOfLines={1}>
              {target.name}
            </AppText>
            <View style={styles.subRow}>
              <StatusChip phase={phase} verified={verified} />
              <AppText variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>
                {host}
              </AppText>
            </View>
          </View>
          <Pressable onPress={() => openMenu(target.url)} hitSlop={8} style={styles.iconButton} accessibilityLabel="Abrir en el navegador">
            <Ionicons name="open-outline" size={20} color={colors.ink} />
          </Pressable>
          <Pressable onPress={onClose} hitSlop={8} style={styles.iconButton} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {showFrame && (
            <MenuFrame src={src} sandboxed={preview?.kind !== 'pdf' || !wide} onLoad={() => setLoaded(true)} />
          )}

          {(phase === 'checking' || phase === 'loading') && (
            <View style={styles.overlay} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="small">{phase === 'checking' ? 'Verificando el menú…' : 'Cargando el menú…'}</AppText>
            </View>
          )}

          {phase === 'slow' && (
            <View style={styles.slowBanner}>
              <AppText variant="small" style={{ flex: 1, color: colors.ink }}>
                El menú está tardando en cargar.
              </AppText>
              <Button title="Abrir afuera" variant="secondary" onPress={() => openMenu(target.url)} style={styles.smallButton} />
            </View>
          )}

          {!showFrame && phase !== 'checking' && (
            <Fallback phase={phase} preview={preview!} onOpen={() => openMenu(target.url)} onClose={onClose} />
          )}
        </View>
      </View>
    </View>
  );
}

const CHIP: Record<Phase, { label: string; icon: IconName; fg: string; bg: string }> = {
  checking: { label: 'Verificando', icon: 'shield-outline', fg: colors.inkSoft, bg: colors.surfaceAlt },
  loading: { label: 'Cargando', icon: 'hourglass-outline', fg: colors.inkSoft, bg: colors.surfaceAlt },
  loaded: { label: 'Menú cargado', icon: 'checkmark-circle', fg: colors.success, bg: colors.successSoft },
  slow: { label: 'Tarda en cargar', icon: 'time', fg: colors.warning, bg: colors.warningSoft },
  blocked: { label: 'No se puede mostrar acá', icon: 'eye-off', fg: colors.warning, bg: colors.warningSoft },
  broken: { label: 'Link roto', icon: 'unlink', fg: colors.danger, bg: colors.dangerSoft },
  unreachable: { label: 'Sitio caído', icon: 'cloud-offline', fg: colors.danger, bg: colors.dangerSoft },
  invalid: { label: 'Link inválido', icon: 'alert-circle', fg: colors.danger, bg: colors.dangerSoft },
};

function StatusChip({ phase, verified }: { phase: Phase; verified: boolean }) {
  const c = phase === 'loaded' && !verified
    ? { ...CHIP.loaded, label: 'Cargado · sin verificar', fg: colors.warning, bg: colors.warningSoft }
    : CHIP[phase];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={12} color={c.fg} />
      <Text style={[styles.chipText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

function Fallback({
  phase,
  preview,
  onOpen,
  onClose,
}: {
  phase: Phase;
  preview: MenuPreview;
  onOpen: () => void;
  onClose: () => void;
}) {
  const copy: Record<string, { icon: IconName; title: string; text: string; cta: string }> = {
    blocked: {
      icon: 'eye-off-outline',
      title: 'Este menú no se puede ver dentro de FoodTrack',
      text: 'El sitio del restaurante no permite mostrarse dentro de otras apps. Podés abrirlo en una pestaña nueva.',
      cta: 'Abrir menú',
    },
    broken: {
      icon: 'unlink-outline',
      title: 'El link del menú no funciona',
      text: `El sitio respondió con un error${preview.httpStatus ? ` (${preview.httpStatus})` : ''}. Puede que el restaurante haya cambiado su menú.`,
      cta: 'Intentar abrir igual',
    },
    unreachable: {
      icon: 'cloud-offline-outline',
      title: 'No pudimos conectar con el sitio',
      text: 'El sitio del menú no responde en este momento. Probá de nuevo en un rato.',
      cta: 'Intentar abrir igual',
    },
    invalid: {
      icon: 'alert-circle-outline',
      title: 'El link del menú no es válido',
      text: 'Este lugar tiene cargado un link que no se puede abrir.',
      cta: 'Ver el link',
    },
  };
  const c = copy[phase] ?? copy.unreachable;
  return (
    <View style={styles.fallback}>
      <View style={styles.fallbackIcon}>
        <Ionicons name={c.icon} size={34} color={colors.primary} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {c.title}
      </AppText>
      {preview.title && (
        <AppText variant="label" style={{ textAlign: 'center', color: colors.inkSoft }} numberOfLines={2}>
          “{preview.title}”
        </AppText>
      )}
      <AppText variant="small" style={{ textAlign: 'center', maxWidth: 360 }}>
        {c.text}
      </AppText>
      {phase !== 'invalid' && <Button title={c.cta} icon="open-outline" onPress={onOpen} />}
      <Button title="Volver al mapa" variant="ghost" onPress={onClose} />
    </View>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** URL final del iframe. Los PDF en pantallas chicas van por el visor de Google (los navegadores móviles no los muestran embebidos). */
function frameSrc(original: string, preview: MenuPreview | null | undefined, wide: boolean) {
  const url = preview?.embedUrl ?? original;
  if (preview?.kind === 'pdf' && !wide) {
    return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
  }
  return url;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30, 26, 22, 0.55)', justifyContent: 'flex-end' },
  backdropWide: { justifyContent: 'center', alignItems: 'center', padding: space.xl },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    ...shadow,
  },
  sheetWide: { flex: 0, width: '100%', maxWidth: 980, height: '92%', borderRadius: radius.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: font.size.xs, fontWeight: '700', fontFamily: font.family },
  body: { flex: 1, backgroundColor: colors.surfaceAlt },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
  },
  slowBanner: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    ...shadow,
  },
  smallButton: { minHeight: 36, paddingHorizontal: space.md },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  fallbackIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
