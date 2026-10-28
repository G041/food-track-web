import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { QrScanner } from '@/components/qr-scanner';
import RestaurantMap from '@/components/restaurant-map';
import { AppText, Button, Card, Chip, Notice, Screen, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useSubmitRestaurant } from '@/features/restaurants/queries';
import { validateDraft, type DraftErrors, type RestaurantDraft } from '@/features/restaurants/validation';
import { DEFAULT_CENTER, useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES } from '@/lib/categories';
import { isHttpUrl } from '@/lib/text';
import { colors, radius, space } from '@/theme/tokens';

type Step = 'source' | 'scan' | 'link' | 'form' | 'done';

const EMPTY: RestaurantDraft = {
  menu_url: '',
  name: '',
  category: null,
  address: '',
  latitude: null,
  longitude: null,
};

export default function AportarScreen() {
  const { session, isAdmin } = useAuth();
  const [step, setStep] = useState<Step>('source');
  const [draft, setDraft] = useState<RestaurantDraft>(EMPTY);
  // Las pestañas quedan montadas al navegar: sin esto la cámara seguiría encendida en otras pantallas.
  const isFocused = useIsFocused();

  if (!session) {
    return (
      <Screen>
        <Header />
        <Card>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
          <AppText variant="heading">Ingresá para aportar</AppText>
          <AppText variant="small">
            Necesitás una cuenta para sumar lugares. Así podemos revisar cada aporte y darte los puntos.
          </AppText>
          <Button title="Ingresar o crear cuenta" icon="person" onPress={() => router.navigate('/perfil')} />
        </Card>
        <HowItWorks />
      </Screen>
    );
  }

  function startForm(menuUrl: string) {
    setDraft({ ...EMPTY, menu_url: menuUrl.trim() });
    setStep('form');
  }

  return (
    <Screen>
      <Header />
      {step === 'source' && (
        <>
          <OptionCard
            icon="qr-code"
            title="Escanear QR del menú"
            text="Usá la cámara del celu en la mesa del local."
            onPress={() => setStep('scan')}
          />
          <OptionCard
            icon="link"
            title="Pegar el link del menú"
            text="Si ya tenés la URL del menú digital."
            onPress={() => setStep('link')}
          />
          <HowItWorks />
        </>
      )}

      {step === 'scan' && isFocused && <ScanStep onUrl={startForm} onCancel={() => setStep('source')} />}

      {step === 'link' && <LinkStep onUrl={startForm} onCancel={() => setStep('source')} />}

      {step === 'form' && (
        <FormStep
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setStep('source')}
          onDone={() => setStep('done')}
        />
      )}

      {step === 'done' && (
        <Card style={{ alignItems: 'center' }}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {isAdmin ? '¡Publicado!' : '¡Gracias! Tu aporte quedó en revisión'}
          </AppText>
          <AppText variant="small" style={{ textAlign: 'center' }}>
            {isAdmin
              ? 'Como sos admin, el lugar ya está en el mapa.'
              : 'Un moderador lo va a revisar. Cuando se apruebe aparece en el mapa y sumás 10 puntos.'}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button title="Aportar otro" icon="add" onPress={() => setStep('source')} />
            <Button title="Ver mis aportes" variant="secondary" onPress={() => router.navigate('/perfil')} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

function Header() {
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="title">Sumá un lugar</AppText>
      <AppText variant="small">Compartí el menú de un local para que otros lo encuentren en el mapa.</AppText>
    </View>
  );
}

function HowItWorks() {
  return (
    <Card style={{ backgroundColor: colors.surfaceAlt }}>
      <AppText variant="label">¿Cómo funciona?</AppText>
      {[
        ['qr-code-outline', 'Escaneás el QR o pegás el link del menú.'],
        ['create-outline', 'Completás nombre, categoría y ubicación.'],
        ['shield-checkmark-outline', 'Un moderador revisa el aporte antes de publicarlo.'],
        ['trophy-outline', 'Si se aprueba, aparece en el mapa y sumás puntos.'],
      ].map(([icon, text]) => (
        <View key={text} style={styles.stepRow}>
          <Ionicons name={icon as 'qr-code-outline'} size={18} color={colors.primary} />
          <AppText variant="small" style={{ flex: 1, color: colors.ink }}>
            {text}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

function OptionCard({
  icon,
  title,
  text,
  onPress,
}: {
  icon: 'qr-code' | 'link';
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="small">{text}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.inkMuted} />
    </Pressable>
  );
}

function ScanStep({ onUrl, onCancel }: { onUrl: (url: string) => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (error) {
    return (
      <Card>
        <Notice tone="error">{error}</Notice>
        <Button
          title="Escanear otro"
          icon="qr-code"
          onPress={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        />
        <Button title="Volver" variant="ghost" onPress={onCancel} />
      </Card>
    );
  }

  return (
    <QrScanner
      key={attempt}
      onCancel={onCancel}
      onScan={(data) => (isHttpUrl(data) ? onUrl(data) : setError('Ese QR no contiene un link a un menú.'))}
    />
  );
}

function LinkStep({ onUrl, onCancel }: { onUrl: (url: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  return (
    <Card>
      <TextField
        label="Link del menú"
        icon="link"
        value={value}
        onChangeText={(v) => {
          setValue(v);
          setError(undefined);
        }}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={error}
      />
      <Button
        title="Continuar"
        icon="arrow-forward"
        onPress={() => (isHttpUrl(value) ? onUrl(value) : setError('Tiene que ser un link http(s) válido.'))}
      />
      <Button title="Volver" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

function FormStep({
  draft,
  setDraft,
  onCancel,
  onDone,
}: {
  draft: RestaurantDraft;
  setDraft: React.Dispatch<React.SetStateAction<RestaurantDraft>>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { location, locate } = useUserLocation();
  const submit = useSubmitRestaurant();
  const [errors, setErrors] = useState<DraftErrors>({});

  const set = <K extends keyof RestaurantDraft>(key: K, value: RestaurantDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const point = draft.latitude != null && draft.longitude != null ? { latitude: draft.latitude, longitude: draft.longitude } : null;
  const pick = (c: { latitude: number; longitude: number }) => {
    setDraft((d) => ({ ...d, ...c }));
    setErrors((e) => ({ ...e, latitude: undefined }));
  };

  // Por defecto, la ubicación actual (normalmente estás en el local al escanear)
  useEffect(() => {
    if (location) setDraft((d) => (d.latitude == null ? { ...d, ...location } : d));
  }, [location, setDraft]);

  async function useMyLocation() {
    const coords = location ?? (await locate());
    if (coords) pick(coords);
  }

  function handleSubmit() {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    submit.mutate(
      {
        menu_url: draft.menu_url.trim(),
        name: draft.name.trim(),
        category: draft.category!,
        address: draft.address.trim() || null,
        latitude: draft.latitude!,
        longitude: draft.longitude!,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Card>
      <TextField
        label="Link del menú"
        icon="link"
        value={draft.menu_url}
        onChangeText={(v) => set('menu_url', v)}
        autoCapitalize="none"
        error={errors.menu_url}
      />
      <TextField
        label="Nombre del lugar"
        icon="storefront-outline"
        value={draft.name}
        onChangeText={(v) => set('name', v)}
        placeholder="Ej: Café Tortoni"
        maxLength={80}
        error={errors.name}
      />

      <View style={{ gap: space.sm }}>
        <AppText variant="label">Categoría</AppText>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.slug}
              label={c.name}
              icon={c.icon}
              color={c.color}
              active={draft.category === c.slug}
              onPress={() => set('category', c.slug)}
            />
          ))}
        </View>
        {errors.category && <AppText style={styles.error}>{errors.category}</AppText>}
      </View>

      <TextField
        label="Dirección (opcional)"
        icon="location-outline"
        value={draft.address}
        onChangeText={(v) => set('address', v)}
        placeholder="Calle y número, barrio"
        maxLength={160}
        error={errors.address}
      />

      <View style={{ gap: space.sm }}>
        <View style={styles.locationHeader}>
          <AppText variant="label">Ubicación</AppText>
          <Button title="Usar mi ubicación" icon="navigate" variant="ghost" onPress={useMyLocation} style={styles.inlineButton} />
        </View>
        <AppText variant="small">Tocá el mapa para marcar dónde está el local. Podés arrastrar el pin.</AppText>
        <View style={[styles.mapBox, !!errors.latitude && { borderColor: colors.danger }]}>
          <RestaurantMap
            initialCenter={point ?? location ?? DEFAULT_CENTER}
            initialZoom={point || location ? 15 : 12}
            focus={point}
            userLocation={location}
            pickedPoint={point}
            onPick={pick}
          />
        </View>
        {errors.latitude && <AppText style={styles.error}>{errors.latitude}</AppText>}
      </View>

      {submit.error && <Notice tone="error">{submit.error.message}</Notice>}

      <Button title="Enviar a revisión" icon="paper-plane" loading={submit.isPending} onPress={handleSubmit} />
      <Button title="Cancelar" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  error: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineButton: { minHeight: 32, paddingHorizontal: space.sm },
  mapBox: { height: 260, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.line },
  doneIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
