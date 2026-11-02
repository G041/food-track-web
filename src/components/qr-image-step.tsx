import Ionicons from '@expo/vector-icons/Ionicons';
import { scanFromURLAsync } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { isHttpUrl } from '@/lib/text';
import { colors, radius, space } from '@/theme/tokens';

import { AppText, Button, Card } from './ui';

const native = Platform.OS !== 'web';
const MAX_IMAGE_HEIGHT = 380;
const MIN_FRAME = 64;
const HANDLE = 28;

type Picked = { uri: string; width: number; height: number };
/** Recuadro en píxeles de pantalla, con el tamaño de la imagen mostrada para poder escalarlo. */
type Frame = { x: number; y: number; w: number; h: number; imageW: number; imageH: number };
type Phase = 'idle' | 'crop' | 'scanning' | 'error';
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Aporte desde una foto de la galería: elegir la foto, marcar dónde está el QR y leerlo.
 * Entrega el link por onUrl, igual que el escáner de cámara y el link pegado.
 */
export function QrImageStep({ onUrl, onCancel }: { onUrl: (url: string) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [image, setImage] = useState<Picked | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [message, setMessage] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);

  async function pickImage() {
    setPickError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || !result.assets[0]) return;
      const { uri, width, height } = result.assets[0];
      setImage({ uri, width, height });
      setFrame(null);
      setPhase('crop');
    } catch {
      setPickError('No pudimos abrir la galería. Revisá los permisos de fotos e intentá de nuevo.');
    }
  }

  async function scan() {
    if (!image || !frame) return;
    setPhase('scanning');
    try {
      const ratio = image.width / frame.imageW;
      const fullFrame = frame.x <= 1 && frame.y <= 1 && frame.w >= frame.imageW - 1 && frame.h >= frame.imageH - 1;
      let uri = image.uri;
      if (!fullFrame) {
        const originX = clamp(Math.round(frame.x * ratio), 0, image.width - 1);
        const originY = clamp(Math.round(frame.y * ratio), 0, image.height - 1);
        const width = clamp(Math.round(frame.w * ratio), 1, image.width - originX);
        const height = clamp(Math.round(frame.h * ratio), 1, image.height - originY);
        const rendered = await ImageManipulator.manipulate(image.uri).crop({ originX, originY, width, height }).renderAsync();
        uri = (await rendered.saveAsync({ format: SaveFormat.PNG })).uri;
      }
      const found = await scanFromURLAsync(uri, ['qr']);
      const data = found[0]?.data;
      if (!data) {
        setMessage('No encontramos ningún código QR en la zona marcada.');
        setPhase('error');
      } else if (!isHttpUrl(data)) {
        setMessage('Ese QR no contiene un link a un menú.');
        setPhase('error');
      } else {
        onUrl(data);
      }
    } catch {
      setMessage('No pudimos leer la imagen.');
      setPhase('error');
    }
  }

  if (phase === 'error') {
    return (
      <ScanFailed
        message={message}
        onRetry={() => setPhase('crop')}
        onOther={() => {
          setPhase('idle');
          void pickImage();
        }}
        onCancel={onCancel}
      />
    );
  }

  if ((phase === 'crop' || phase === 'scanning') && image) {
    const busy = phase === 'scanning';
    return (
      <Card>
        <AppText variant="heading">¿Dónde está el QR?</AppText>
        <AppText variant="small">
          Ajustá el recuadro para que encierre solo el código. Si ya ocupa toda la foto, podés leerla directo.
        </AppText>
        <CropArea image={image} frame={frame} onFrame={setFrame} disabled={busy} />
        <Button title="Leer QR" icon="scan" loading={busy} disabled={!frame} onPress={scan} />
        <Button title="Elegir otra foto" icon="images" variant="secondary" disabled={busy} onPress={pickImage} />
        <Button title="Volver" variant="ghost" disabled={busy} onPress={onCancel} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.pickIcon}>
        <Ionicons name="images" size={30} color={colors.primary} />
      </View>
      <AppText variant="heading">Subí una foto con el QR</AppText>
      <AppText variant="small">
        Elegí una captura o foto de tu galería. Después marcás en qué parte está el código.
      </AppText>
      {pickError && <AppText style={styles.pickError}>{pickError}</AppText>}
      <Button title="Elegir foto de la galería" icon="images" onPress={pickImage} />
      <Button title="Volver" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

/** Imagen con un recuadro que se mueve arrastrándolo y se redimensiona desde las esquinas. */
function CropArea({
  image,
  frame,
  onFrame,
  disabled,
}: {
  image: Picked;
  frame: Frame | null;
  onFrame: (frame: Frame) => void;
  disabled?: boolean;
}) {
  const [boxWidth, setBoxWidth] = useState(0);
  const display = useMemo(() => {
    if (!boxWidth) return { w: 0, h: 0 };
    const scale = Math.min(boxWidth / image.width, MAX_IMAGE_HEIGHT / image.height);
    return { w: Math.round(image.width * scale), h: Math.round(image.height * scale) };
  }, [boxWidth, image.width, image.height]);

  // El recuadro arranca cubriendo toda la imagen.
  useEffect(() => {
    if (display.w) onFrame({ x: 0, y: 0, w: display.w, h: display.h, imageW: display.w, imageH: display.h });
    // Solo al cambiar el tamaño mostrado (nueva foto o ancho disponible).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display.w, display.h]);

  const live = useRef({ frame, display, disabled });
  useEffect(() => {
    live.current = { frame, display, disabled };
  });
  const startRect = useRef<Frame | null>(null);

  // Los handlers leen refs solo cuando ocurre el gesto (no durante el render).
  // eslint-disable-next-line react-hooks/refs
  const [responders] = useState(() => {
    const make = (kind: 'move' | Corner) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRect.current = live.current.frame;
        },
        onPanResponderMove: (_e, g) => {
          const s = startRect.current;
          const d = live.current.display;
          if (!s) return;
          let { x, y, w, h } = s;
          if (kind === 'move') {
            x = clamp(s.x + g.dx, 0, d.w - s.w);
            y = clamp(s.y + g.dy, 0, d.h - s.h);
          } else {
            const right = s.x + s.w;
            const bottom = s.y + s.h;
            if (kind === 'tl' || kind === 'bl') {
              x = clamp(s.x + g.dx, 0, right - MIN_FRAME);
              w = right - x;
            } else {
              w = clamp(s.w + g.dx, MIN_FRAME, d.w - s.x);
            }
            if (kind === 'tl' || kind === 'tr') {
              y = clamp(s.y + g.dy, 0, bottom - MIN_FRAME);
              h = bottom - y;
            } else {
              h = clamp(s.h + g.dy, MIN_FRAME, d.h - s.y);
            }
          }
          onFrame({ x, y, w, h, imageW: d.w, imageH: d.h });
        },
      });
    return { move: make('move'), tl: make('tl'), tr: make('tr'), bl: make('bl'), br: make('br') };
  });

  const touch = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle) : null;

  return (
    <View style={styles.cropBox} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
      {display.w > 0 && (
        <View style={{ width: display.w, height: display.h }}>
          <Image source={{ uri: image.uri }} style={{ width: display.w, height: display.h }} resizeMode="stretch" />
          {frame && (
            <>
              {/* Velo oscuro alrededor del recuadro */}
              <View pointerEvents="none" style={[styles.shade, { top: 0, left: 0, right: 0, height: frame.y }]} />
              <View pointerEvents="none" style={[styles.shade, { top: frame.y + frame.h, left: 0, right: 0, bottom: 0 }]} />
              <View pointerEvents="none" style={[styles.shade, { top: frame.y, left: 0, width: frame.x, height: frame.h }]} />
              <View
                pointerEvents="none"
                style={[styles.shade, { top: frame.y, left: frame.x + frame.w, right: 0, height: frame.h }]}
              />
              <View
                {...responders.move.panHandlers}
                style={[styles.frame, touch, { left: frame.x, top: frame.y, width: frame.w, height: frame.h }]}
              />
              {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((corner) => (
                <View
                  key={corner}
                  {...responders[corner].panHandlers}
                  style={[
                    styles.handle,
                    touch,
                    {
                      left: (corner.endsWith('l') ? frame.x : frame.x + frame.w) - HANDLE / 2,
                      top: (corner.startsWith('t') ? frame.y : frame.y + frame.h) - HANDLE / 2,
                    },
                  ]}>
                  <View style={styles.handleDot} />
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** Error visual: el ícono rebota y se sacude para dejar claro que no se pudo leer. */
function ScanFailed({
  message,
  onRetry,
  onOther,
  onCancel,
}: {
  message: string;
  onRetry: () => void;
  onOther: () => void;
  onCancel: () => void;
}) {
  const pop = useState(() => new Animated.Value(0))[0];
  const shake = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: native }).start();
    Animated.spring(pop, { toValue: 1, bounciness: 14, speed: 12, useNativeDriver: native }).start(() => {
      Animated.sequence(
        [10, -10, 7, -7, 3, 0].map((toValue) =>
          Animated.timing(shake, { toValue, duration: 70, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        ),
      ).start();
    });
  }, [pop, shake, fade]);

  return (
    <Animated.View style={{ opacity: fade }}>
      <Card style={styles.failedCard}>
        <Animated.View style={[styles.failedIcon, { transform: [{ scale: pop }, { translateX: shake }] }]}>
          <Ionicons name="qr-code-outline" size={44} color={colors.danger} />
          <View style={styles.failedBadge}>
            <Ionicons name="close" size={16} color="#fff" />
          </View>
        </Animated.View>
        <AppText variant="heading" style={{ textAlign: 'center' }}>
          No pudimos leer el QR
        </AppText>
        <AppText variant="small" style={{ textAlign: 'center' }}>
          {message} Probá marcando solo el código, con la foto bien enfocada y sin reflejos.
        </AppText>
        <Button title="Marcar de nuevo" icon="crop" onPress={onRetry} />
        <Button title="Elegir otra foto" icon="images" variant="secondary" onPress={onOther} />
        <Button title="Volver" variant="ghost" onPress={onCancel} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pickIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickError: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  cropBox: { alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden', borderRadius: radius.md },
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: colors.accent },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, alignItems: 'center', justifyContent: 'center' },
  handleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#fff',
  },
  failedCard: { alignItems: 'stretch', gap: space.md },
  failedIcon: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
