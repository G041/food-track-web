import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import MenuModal from '@/components/menu-modal';
import { AppText, Notice, Screen } from '@/components/ui';
import { AuthProvider } from '@/features/auth/auth-provider';
import { isMisconfigured } from '@/lib/api';
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

  if (isMisconfigured) return <MissingConfig />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" options={{ title: 'Moderación' }} />
        </Stack>
        <MenuModal />
      </AuthProvider>
    </QueryClientProvider>
  );
}
