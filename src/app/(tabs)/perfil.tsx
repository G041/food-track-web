import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Notice, Screen, StatusBadge, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useMySubmissions, usePendingRestaurants, useWithdrawRestaurant } from '@/features/restaurants/queries';
import { api, isDemo } from '@/lib/api';
import { DEMO_ADMIN } from '@/lib/api/demo-api';
import { categoryMeta } from '@/lib/categories';
import { formatDate } from '@/lib/text';
import { colors, radius, space } from '@/theme/tokens';

export default function PerfilScreen() {
  const { session, isLoading } = useAuth();
  return (
    <Screen>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : session ? <ProfileView /> : <AuthForm />}
    </Screen>
  );
}

function ProfileView() {
  const { session, profile, isAdmin } = useAuth();
  const { data: mine = [], isLoading } = useMySubmissions(session?.userId);
  const { data: pending = [] } = usePendingRestaurants(isAdmin);
  const withdraw = useWithdrawRestaurant();

  const approved = mine.filter((r) => r.status === 'approved').length;

  return (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{profile?.username.slice(0, 1).toUpperCase() ?? '?'}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {profile?.username ?? '…'}
          </AppText>
          <AppText variant="small">{session?.email}</AppText>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={profile?.points ?? 0} label="Puntos" icon="trophy" />
        <Stat value={approved} label="Publicados" icon="checkmark-circle" />
        <Stat value={mine.length - approved} label="Otros" icon="time" />
      </View>

      {isAdmin && (
        <Pressable onPress={() => router.push('/admin')} style={({ pressed }) => [styles.adminCard, pressed && { opacity: 0.85 }]}>
          <Ionicons name="shield-checkmark" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ color: '#fff' }}>
              Panel de moderación
            </AppText>
            <AppText variant="small" style={{ color: '#ffffffcc' }}>
              {pending.length === 0 ? 'No hay aportes pendientes' : `${pending.length} aportes esperan revisión`}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </Pressable>
      )}

      <AppText variant="heading">Mis aportes</AppText>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : mine.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="restaurant-outline" size={32} color={colors.inkMuted} />
          <AppText variant="small" style={{ textAlign: 'center' }}>
            Todavía no sumaste lugares. ¡Escaneá el QR del próximo menú que veas!
          </AppText>
          <Button title="Aportar un lugar" icon="add" onPress={() => router.navigate('/aportar')} />
        </Card>
      ) : (
        mine.map((r) => (
          <Card key={r.id} style={{ gap: space.sm }}>
            <View style={styles.rowBetween}>
              <StatusBadge status={r.status} />
              <AppText variant="small">{formatDate(r.created_at)}</AppText>
            </View>
            <AppText variant="heading">{r.name}</AppText>
            <AppText variant="small">
              {categoryMeta(r.category).name}
              {r.address ? ` · ${r.address}` : ''}
            </AppText>
            {r.status === 'rejected' && r.review_note && (
              <Notice tone="error" icon="chatbubble-ellipses">
                Motivo: {r.review_note}
              </Notice>
            )}
            {r.status === 'pending' && (
              <Button
                title="Retirar aporte"
                variant="danger"
                icon="trash-outline"
                loading={withdraw.isPending && withdraw.variables === r.id}
                onPress={() => withdraw.mutate(r.id)}
                style={{ alignSelf: 'flex-start', minHeight: 40 }}
              />
            )}
          </Card>
        ))
      )}

      <Button title="Cerrar sesión" variant="secondary" icon="log-out-outline" onPress={() => api.signOut()} />
    </>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: 'trophy' | 'checkmark-circle' | 'time' }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Ingresá un email válido.');
    if (mode === 'signup' && !/^[A-Za-z0-9_.]{4,15}$/.test(username)) {
      return setError('El usuario debe tener entre 4 y 15 caracteres (letras, números, punto o guion bajo).');
    }
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');

    setLoading(true);
    try {
      if (mode === 'login') {
        await api.signIn(email, password);
      } else {
        const { needsConfirmation } = await api.signUp(email, username, password);
        if (needsConfirmation) {
          setInfo('¡Cuenta creada! Te mandamos un email para confirmarla antes de ingresar.');
          setMode('login');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">{mode === 'login' ? 'Hola de nuevo' : 'Creá tu cuenta'}</AppText>
        <AppText variant="small">Con una cuenta podés sumar lugares al mapa y ganar puntos.</AppText>
      </View>

      <View style={styles.segment}>
        {(['login', 'signup'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setError(null);
            }}
            style={[styles.segmentItem, mode === m && styles.segmentActive]}>
            <AppText style={[styles.segmentText, mode === m && { color: colors.ink }]}>
              {m === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Card>
        <TextField
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="vos@email.com"
        />
        {mode === 'signup' && (
          <TextField
            label="Nombre de usuario"
            icon="at"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={15}
            placeholder="foodlover"
          />
        )}
        <TextField
          label="Contraseña"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Mínimo 6 caracteres"
          onSubmitEditing={submit}
        />
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        <Button title={mode === 'login' ? 'Ingresar' : 'Crear cuenta'} loading={loading} onPress={submit} />
      </Card>

      {isDemo && (
        <Notice>
          Modo demo (sin Supabase): los datos se guardan en este navegador. Para moderar, entrá con{' '}
          {DEMO_ADMIN.email} / {DEMO_ADMIN.password}.
        </Notice>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    alignItems: 'center',
    gap: 2,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: space.sm + 2, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontWeight: '700', color: colors.inkSoft },
});
