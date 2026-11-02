import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { HoldToDeleteButton } from '@/components/hold-to-delete';
import { AppText, Button, Notice } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useMenuViewer, type MenuTarget } from '@/features/menu/menu-store';
import { useDeleteRestaurant } from '@/features/restaurants/queries';
import { useMenuPreview, type MenuPreview } from '@/features/menu/use-menu-preview';
import { categoryMeta } from '@/lib/categories';
import { openMenu } from '@/lib/links';
import { setPageZoomEnabled } from '@/lib/page-zoom';
import { useStatusBarInset } from '@/hooks/use-header-offset';
import { colors, font, radius, shadow, space } from '@/theme/tokens';

import MenuFrame from './menu-frame';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SLOW_MS = 15_000;
// Borrar un lugar de la base no se puede deshacer: hay que mantener apretado el botón.
const DELETE_HOLD_SECONDS = 5;
const WIDE = 768;

/** Modal global con la vista previa del menú. Se abre con useMenuViewer().open(...). */
export default function MenuModal() {
  const { target, close } = useMenuViewer();
  // El zoom de página solo se permite mientras se lee un menú.
  useEffect(() => {
    setPageZoomEnabled(!!target);
  }, [target]);
  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
      {target && <MenuSheet key={target.url} target={target} onClose={close} />}
    </Modal>
  );
}

type Phase = 'checking' | 'loading' | 'loaded' | 'slow' | 'blocked' | 'broken' | 'unreachable' | 'invalid';

function MenuSheet({ target, onClose }: { target: MenuTarget; onClose: () => void }) {
  // El menú ocupa toda la pantalla; solo se respeta la franja de la barra de estado.
  const statusInset = useStatusBarInset();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { data: preview, isLoading } = useMenuPreview(target.url);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const { isAdmin } = useAuth();
  const deleteRestaurant = useDeleteRestaurant();
  const canDelete = isAdmin && target.id != null;
  // Aviso mientras se mantiene apretado el botón de eliminar, o si se soltó antes de tiempo.
  const [hint, setHint] = useState<'holding' | 'early' | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );
  function remindHold() {
    setHint('early');
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2500);
  }

  // Arrastrar la cabecera hacia abajo cierra el menú. El contenido es una página de otro sitio dentro de un
  // iframe: el navegador no informa su scroll ni sus toques, así que el gesto vive en la cabecera.
  const [drag] = useState(() => new Animated.Value(0));
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // Los handlers leen refs solo cuando ocurre el gesto (no durante el render).
  // eslint-disable-next-line react-hooks/refs
  const [pull] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 110 || g.vy > 0.7) {
          Animated.timing(drag, { toValue: 900, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start(() =>
            closeRef.current(),
          );
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== 'web', bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
    }),
  );

  // null = no hay verificador disponible: se intenta mostrar el link original.
  // En nativo el WebView no respeta X-Frame-Options: los sitios "blocked" también se ven adentro.
  const showFrame =
    !isLoading &&
    (!preview ||
      preview.status === 'embeddable' ||
      preview.status === 'unverified' ||
      (Platform.OS !== 'web' && preview.status === 'blocked'));
  const verified = preview?.status === 'embeddable';

  useEffect(() => {
    if (!showFrame || loaded) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [showFrame, loaded]);

  const phase: Phase = isLoading
    ? 'checking'
    : !showFrame
      ? ((preview?.status ?? 'unreachable') as Phase)
      : loaded
        ? 'loaded'
        : slow
          ? 'slow'
          : 'loading';

  const meta = categoryMeta(target.category);
  const host = safeHost(preview?.finalUrl ?? target.url);
  const src = frameSrc(target.url, preview, wide);

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.sheet, { paddingTop: statusInset, transform: [{ translateY: drag }] }]}>
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
            preview && <Fallback phase={phase} preview={preview} onOpen={() => openMenu(target.url)} onClose={onClose} />
          )}
        </View>

        {/* HUD flotante sobre el menú, siempre visible. */}
        <View pointerEvents="box-none" style={[styles.hud, { top: statusInset + space.sm }]}>
        <View
          {...pull.panHandlers}
          style={[styles.header, Platform.OS === 'web' && ({ touchAction: 'none' } as unknown as ViewStyle)]}>
          <View style={styles.grab} pointerEvents="none" />
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
          {canDelete && (
            <HoldToDeleteButton
              seconds={DELETE_HOLD_SECONDS}
              busy={deleteRestaurant.isPending}
              accessibilityLabel="Eliminar este menú de la base de datos"
              onHoldChange={(holding) => {
                if (holding) deleteRestaurant.reset();
                setHint(holding ? 'holding' : null);
              }}
              onEarlyRelease={remindHold}
              onConfirm={() => deleteRestaurant.mutate(target.id!, { onSuccess: onClose })}
            />
          )}
          <Pressable onPress={onClose} hitSlop={8} style={styles.iconButton} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {(deleteRestaurant.error || hint || deleteRestaurant.isPending) && (
          <View style={styles.hudNotice}>
            {deleteRestaurant.error ? (
              <Notice tone="error">{deleteRestaurant.error.message}</Notice>
            ) : (
              <Notice tone="error" icon="trash">
                {deleteRestaurant.isPending
                  ? 'Eliminando el menú…'
                  : hint === 'holding'
                    ? `Seguí apretando para eliminar este menú. No se puede deshacer.`
                    : `Mantené apretado el tacho ${DELETE_HOLD_SECONDS} segundos para eliminar este menú.`}
              </Notice>
            )}
          </View>
        )}
        </View>
      </Animated.View>

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

/**
 * URL final del iframe/WebView. Los PDF en pantallas chicas van por el visor de Google (los navegadores
 * móviles y el WebView de Android no los muestran embebidos); el WebView de iOS sí los abre directo.
 */
function frameSrc(original: string, preview: MenuPreview | null | undefined, wide: boolean) {
  const url = preview?.embedUrl ?? original;
  if (preview?.kind === 'pdf' && !wide && Platform.OS !== 'ios') {
    return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
  }
  if (preview?.kind === 'pdf') {
    // Parámetros de apertura de PDF: ocultan la barra de páginas y zoom y el panel lateral del
    // visor del navegador (Chrome y Edge los respetan; Safari ya muestra un visor mínimo).
    return `${url.split('#')[0]}#toolbar=0&navpanes=0&view=FitH`;
  }
  return url;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.surface },
  sheet: { flex: 1, backgroundColor: colors.surface, overflow: 'hidden' },
  hud: { position: 'absolute', left: space.md, right: space.md, alignItems: 'center', gap: space.sm },
  header: {
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  hudNotice: { width: '100%', maxWidth: 720 },
  grab: { position: 'absolute', top: 5, alignSelf: 'center', left: '50%', marginLeft: -20, width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
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
