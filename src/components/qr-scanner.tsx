import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText, Button, Notice } from './ui';

/** Lee un único QR y lo entrega por onScan. Funciona en web (requiere HTTPS) y nativo. */
export function QrScanner({ onScan, onCancel }: { onScan: (data: string) => void; onCancel: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <AppText variant="heading">Necesitamos tu cámara</AppText>
        <AppText variant="small">Solo la usamos para leer el QR del menú. No guardamos imágenes.</AppText>
        {!permission.canAskAgain && (
          <Notice tone="error">Bloqueaste la cámara. Habilitala desde la configuración del navegador.</Notice>
        )}
        <Button title="Permitir cámara" icon="camera" onPress={requestPermission} />
        <Button title="Cancelar" variant="ghost" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          done.current = true;
          onScan(data);
        }}
      />
      <View style={styles.frame} pointerEvents="none" />
      <View style={styles.footer}>
        <AppText style={styles.hint}>Apuntá al código QR del menú</AppText>
        <Button title="Cancelar" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permission: { gap: space.md },
  wrap: {
    height: 420,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: colors.accent,
  },
  footer: { position: 'absolute', bottom: space.lg, left: space.lg, right: space.lg, gap: space.sm },
  hint: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
