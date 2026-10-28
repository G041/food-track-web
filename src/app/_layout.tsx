import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import MenuModal from '@/components/menu-modal';
import { AppText, Notice, Screen } from '@/components/ui';
import { AuthProvider } from '@/features/auth/auth-provider';
import { isMisconfigured } from '@/lib/api';
import { useApplyTheme } from '@/theme/theme-store';
import { colors } from '@/theme/tokens';

function MissingConfig() {
  return (
    <Screen tabBar={false}>
      <AppText variant="title">FoodTrack</AppText>
      <Notice tone="error" icon="construct">
        Falta configurar el backend: definí EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY en el
        hosting y volvé a publicar.
      </Notice>
    </Screen>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );

  const theme = useApplyTheme();
  const insets = useSafeAreaInsets();

  if (isMisconfigured) return <MissingConfig />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" options={{ title: 'Moderación' }} />
        </Stack>
        <MenuModal />
        {/* App instalada en iOS: la barra de estado es translúcida (texto blanco) y va sobre el contenido */}
        {insets.top > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.primary }} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
