import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { openMenu } from '@/lib/links';
import { colors, space } from '@/theme/tokens';

import type { MenuFrameProps } from './types';

// Nativo (fase 5): react-native-webview, que no tiene la restricción de iframes de la web.
export default function MenuFrame({ src }: MenuFrameProps) {
  return (
    <View style={styles.container}>
      <AppText variant="small" style={{ textAlign: 'center' }}>
        La vista previa dentro de la app llega con la versión nativa.
      </AppText>
      <Button title="Abrir menú" icon="open-outline" onPress={() => openMenu(src)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, backgroundColor: colors.surface },
});
