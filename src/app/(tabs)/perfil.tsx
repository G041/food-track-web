import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AdminNotes } from '@/components/admin-notes';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FadeIn } from '@/components/motion';
import { useDebugPanel } from '@/components/safe-area-debug';
import { AppText, Button, Card, Notice, Screen, StatusBadge, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useMySubmissions, usePendingRestaurants, useWithdrawRestaurant } from '@/features/restaurants/queries';
import { api, isDemo } from '@/lib/api';
import { DEMO_ADMIN } from '@/lib/api/demo-api';
import { categoryMeta } from '@/lib/categories';
import { displayUsername, formatDate } from '@/lib/text';
import { toneSwatch } from '@/components/restaurant-map/map-tones';
import { useMapTone, type DarkMapTone, type LightMapTone } from '@/theme/map-tone-store';
import { useResolvedTheme, useThemePreference, type ThemePreference } from '@/theme/theme-store';
import { colors, radius, space } from '@/theme/tokens';

export default function PerfilScreen() {
  const { session, isLoading } = useAuth();
  return (
    <Screen>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : session ? <ProfileView /> : <AuthForm />}
      <AppearanceCard />
    </Screen>
  );
}

function ProfileView() {
  const { session, profile, isAdmin } = useAuth();
  const { data: mine = [], isLoading } = useMySubmissions(session?.userId);
  const { data: pending = [] } = usePendingRestaurants(isAdmin);
  const withdraw = useWithdrawRestaurant();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toWithdraw, setToWithdraw] = useState<{ id: number; name: string } | null>(null);

  const approved = mine.filter((r) => r.status === 'approved').length;

  return (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{profile?.username.slice(0, 1).toUpperCase() ?? '?'}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {profile ? displayUsername(profile.username) : '…'}
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
          <Ionicons name="shield-checkmark" size={26} color={colors.inverseFg} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ color: colors.inverseFg }}>
              Panel de moderación
            </AppText>
            <AppText variant="small" style={{ color: colors.inverseFg, opacity: 0.8 }}>
              {pending.length === 0 ? 'No hay aportes pendientes' : `${pending.length} aportes esperan revisión`}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.inverseFg} />
        </Pressable>
      )}

      {isAdmin && <AdminNotes />}
      {isAdmin && (
        <Button
          title="Diagnóstico de pantalla"
          icon="phone-portrait-outline"
          variant="ghost"
          onPress={() => useDebugPanel.getState().setVisible(true)}
        />
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
                onPress={() => setToWithdraw({ id: r.id, name: r.name })}
                style={{ alignSelf: 'flex-start', minHeight: 40 }}
              />
            )}
          </Card>
        ))
      )}

      <Button title="Cerrar sesión" variant="secondary" icon="log-out-outline" onPress={() => setConfirmLogout(true)} />

      <ConfirmDialog
        visible={confirmLogout}
        icon="log-out-outline"
        title="¿Seguro que querés cerrar la sesión?"
        message="Vas a tener que volver a ingresar para aportar lugares."
        confirmLabel="Cerrar sesión"
        destructive
        loading={signingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setSigningOut(true);
          await api.signOut();
          setSigningOut(false);
          setConfirmLogout(false);
        }}
      />
      <ConfirmDialog
        visible={!!toWithdraw}
        icon="trash-outline"
        title="¿Retirar este aporte?"
        message={toWithdraw ? `"${toWithdraw.name}" se va a quitar de la cola de revisión.` : undefined}
        confirmLabel="Retirar"
        destructive
        loading={withdraw.isPending}
        onCancel={() => setToWithdraw(null)}
        onConfirm={() => {
          // Sin "toWithdraw!": el React Compiler memoiza la expresión y la evaluaría con null.
          if (toWithdraw) withdraw.mutate(toWithdraw.id, { onSettled: () => setToWithdraw(null) });
        }}
      />
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

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

const LIGHT_TONE_OPTIONS: { value: LightMapTone; label: string }[] = [
  { value: 'blanco', label: 'Blanco' },
  { value: 'calido', label: 'Cálido' },
  { value: 'gris', label: 'Gris' },
];
const DARK_TONE_OPTIONS: { value: DarkMapTone; label: string }[] = [
  { value: 'negro', label: 'Negro' },
  { value: 'gris-oscuro', label: 'Gris oscuro' },
  { value: 'gris-claro', label: 'Gris claro' },
];

function AppearanceCard() {
  const { preference, setPreference } = useThemePreference();
  const resolved = useResolvedTheme();
  const tone = useMapTone();
  // El menú de tonos del mapa se despliega con su botón.
  const [tonesOpen, setTonesOpen] = useState(false);
  return (
    <Card style={{ gap: space.sm }}>
      <AppText variant="label">Apariencia</AppText>
      <View style={styles.segment}>
        {THEME_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setPreference(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: preference === o.value }}
            style={[styles.segmentItem, styles.segmentRow, preference === o.value && styles.segmentActive]}>
            <Ionicons name={o.icon} size={16} color={preference === o.value ? colors.ink : colors.inkSoft} />
            <AppText style={[styles.segmentText, preference === o.value && { color: colors.ink }]}>{o.label}</AppText>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setTonesOpen((v) => !v)}
        style={({ pressed }) => [styles.toneToggle, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: tonesOpen }}
        accessibilityLabel={tonesOpen ? 'Ocultar los tonos del mapa' : 'Elegir el tono del mapa'}>
        <Ionicons name="map-outline" size={18} color={colors.primary} />
        <AppText style={{ flex: 1, fontWeight: '700' }}>Tono del mapa</AppText>
        <Ionicons name={tonesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
      </Pressable>

      {tonesOpen && (
        <FadeIn from={8} duration={200} style={{ gap: space.md }}>
          <ToneGroup
            title="Mapa claro"
            inUse={resolved === 'light'}
            theme="light"
            options={LIGHT_TONE_OPTIONS}
            value={tone.light}
            onChange={tone.setLight}
          />
          <ToneGroup
            title="Mapa oscuro"
            inUse={resolved === 'dark'}
            theme="dark"
            options={DARK_TONE_OPTIONS}
            value={tone.dark}
            onChange={tone.setDark}
          />
        </FadeIn>
      )}
    </Card>
  );
}

function ToneGroup<T extends LightMapTone | DarkMapTone>({
  title,
  inUse,
  theme,
  options,
  value,
  onChange,
}: {
  title: string;
  inUse: boolean;
  theme: 'light' | 'dark';
  options: { value: T; label: string }[];
  value: T;
  onChange: (tone: T) => void;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="small" style={{ fontWeight: '700', color: colors.ink }}>
        {title}
        {inUse ? <AppText variant="small"> · en uso</AppText> : null}
      </AppText>
      <View style={styles.toneRow}>
        {options.map((o) => {
          const s = toneSwatch(theme, o.value);
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${title}: ${o.label}`}
              style={[styles.toneTile, active && styles.toneTileActive]}>
              <View style={[styles.toneSwatch, { backgroundColor: s.background }]}>
                <View style={[styles.toneRoad, { backgroundColor: s.road }]} />
                <View style={[styles.toneWater, { backgroundColor: s.water }]} />
              </View>
              <AppText variant="small" style={[{ textAlign: 'center' }, active && { color: colors.ink, fontWeight: '700' }]}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); // en login: email o nombre de usuario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  // Tras un login fallido, la primera tecla de borrar vacía toda la contraseña (como en iOS).
  const [clearOnBackspace, setClearOnBackspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    const id = email.trim();
    if (mode === 'signup' || id.includes('@')) {
      if (!/^\S+@\S+\.\S+$/.test(id)) return setError('Ingresá un email válido.');
    } else if (!/^[A-Za-z0-9_.]{4,15}$/.test(id)) {
      return setError('Ingresá tu email o tu nombre de usuario.');
    }
    if (mode === 'signup' && !/^[A-Za-z0-9_.]{4,15}$/.test(username)) {
      return setError('El usuario debe tener entre 4 y 15 caracteres (letras, números, punto o guion bajo).');
    }
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (mode === 'signup' && password !== password2) return setError('Las contraseñas no coinciden.');

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
      if (mode === 'login') setClearOnBackspace(true);
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
              setPassword2('');
              setClearOnBackspace(false);
            }}
            style={[styles.segmentItem, mode === m && styles.segmentActive]}>
            <AppText style={[styles.segmentText, mode === m && { color: colors.ink }]}>
              {m === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Cambiar entre Ingresar y Crear cuenta anima el formulario. */}
      <FadeIn key={mode} from={12} duration={220}>
      <Card>
        <TextField
          label={mode === 'login' ? 'Email o usuario' : 'Email'}
          icon={mode === 'login' ? 'person-outline' : 'mail-outline'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'login' ? 'username' : 'email'}
          keyboardType={mode === 'login' ? 'default' : 'email-address'}
          placeholder={mode === 'login' ? 'vos@email.com o tu usuario' : 'vos@email.com'}
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
          onChangeText={(v) => {
            setPassword(v);
            setClearOnBackspace(false);
          }}
          onKeyPress={(e) => {
            if (clearOnBackspace && e.nativeEvent.key === 'Backspace') {
              e.preventDefault();
              setPassword('');
              setClearOnBackspace(false);
            }
          }}
          secureTextEntry
          secureToggle
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Mínimo 6 caracteres"
          onSubmitEditing={mode === 'login' ? submit : undefined}
        />
        {mode === 'signup' && (
          <TextField
            label="Repetir contraseña"
            icon="lock-closed-outline"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            placeholder="Escribila de nuevo"
            onSubmitEditing={submit}
            error={password2.length > 0 && password2 !== password.slice(0, password2.length) ? 'No coincide con la contraseña.' : undefined}
          />
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        <Button title={mode === 'login' ? 'Ingresar' : 'Crear cuenta'} loading={loading} onPress={submit} />
      </Card>
      </FadeIn>

      {isDemo && (
        <Notice>
          Modo demo (sin Supabase): los datos se guardan en este navegador. Para moderar, entrá con el usuario{' '}
          admin (o {DEMO_ADMIN.email}) y la contraseña {DEMO_ADMIN.password}.
        </Notice>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toneToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  toneRow: { flexDirection: 'row', gap: space.sm },
  toneTile: {
    flex: 1,
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  toneTileActive: { borderColor: colors.primary },
  toneSwatch: { height: 44, borderRadius: radius.sm, overflow: 'hidden' },
  toneRoad: { position: 'absolute', left: 0, right: 0, top: 16, height: 6 },
  toneWater: { position: 'absolute', right: 0, bottom: 0, width: '40%', height: '45%', borderTopLeftRadius: 10 },
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
    backgroundColor: colors.inverseBg,
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
  segmentRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  segmentText: { fontWeight: '700', color: colors.inkSoft },
});
