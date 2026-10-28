import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FadeIn } from '@/components/motion';
import { AppText, Button, Card, Notice } from '@/components/ui';
import { useAddNote, useAdminNotes, useDeleteNote, useSetNoteDone } from '@/features/restaurants/queries';
import type { AdminNote } from '@/lib/api';
import { formatDate } from '@/lib/text';
import { colors, font, radius, space } from '@/theme/tokens';

const MAX = 2000;

/** Notas internas del equipo (ideas y pendientes). Solo se monta para admins; la base también lo exige (RLS). */
export function AdminNotes() {
  const { data: notes = [], isLoading, error } = useAdminNotes(true);
  const add = useAddNote();
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<AdminNote | null>(null);
  const del = useDeleteNote();

  const open = notes.filter((n) => !n.done);
  const done = notes.filter((n) => n.done);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    add.mutate(body, { onSuccess: () => setDraft('') });
  }

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="document-text" size={20} color={colors.primary} />
        <AppText variant="heading" style={{ flex: 1 }}>
          Notas del equipo
        </AppText>
        <View style={styles.counter}>
          <AppText style={styles.counterText}>{open.length} {open.length === 1 ? 'pendiente' : 'pendientes'}</AppText>
        </View>
      </View>
      <AppText variant="small">Ideas y pendientes que solo ven los administradores.</AppText>

      <View style={styles.inputWrap}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Anotá una idea o un pendiente…"
          placeholderTextColor={colors.inkMuted}
          multiline
          maxLength={MAX}
          style={styles.input}
        />
      </View>
      <View style={styles.row}>
        <AppText variant="small" style={{ flex: 1 }}>
          {draft.length > MAX - 200 ? `${MAX - draft.length} caracteres disponibles` : ' '}
        </AppText>
        <Button
          title="Agregar nota"
          icon="add"
          loading={add.isPending}
          disabled={!draft.trim()}
          onPress={submit}
          style={styles.addButton}
        />
      </View>
      {add.error && <Notice tone="error">{add.error.message}</Notice>}
      {error && <Notice tone="error">No pudimos cargar las notas.</Notice>}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : notes.length === 0 ? (
        <AppText variant="small" style={{ textAlign: 'center', paddingVertical: space.sm }}>
          Todavía no hay notas.
        </AppText>
      ) : (
        <View style={{ gap: space.sm }}>
          {[...open, ...done].map((n) => (
            <FadeIn key={n.id} from={6} duration={200}>
              <NoteRow note={n} onDelete={() => setToDelete(n)} />
            </FadeIn>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={!!toDelete}
        icon="trash-outline"
        title="¿Borrar esta nota?"
        message={toDelete ? `"${toDelete.body.slice(0, 80)}${toDelete.body.length > 80 ? '…' : ''}"` : undefined}
        confirmLabel="Borrar"
        destructive
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
        }}
      />
    </Card>
  );
}

function NoteRow({ note, onDelete }: { note: AdminNote; onDelete: () => void }) {
  const toggle = useSetNoteDone();
  const done = toggle.isPending ? !note.done : note.done; // respuesta inmediata al tocar
  return (
    <View style={[styles.note, done && styles.noteDone]}>
      <Pressable
        onPress={() => toggle.mutate({ id: note.id, done: !note.done })}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Marcar como pendiente' : 'Marcar como hecha'}>
        <Ionicons name={done ? 'checkbox' : 'square-outline'} size={22} color={done ? colors.success : colors.inkSoft} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={[styles.noteBody, done && styles.noteBodyDone]}>{note.body}</AppText>
        <AppText variant="small" style={{ fontSize: font.size.xs }}>
          {note.author ? `@${note.author}` : 'anónimo'} · {formatDate(note.created_at)}
        </AppText>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Borrar nota">
        <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  counter: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  counterText: { color: colors.primaryDark, fontSize: font.size.xs, fontWeight: '700' },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    padding: space.md,
  },
  input: {
    minHeight: 84,
    fontSize: font.size.md,
    color: colors.ink,
    fontFamily: font.family,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addButton: { minHeight: 40, paddingHorizontal: space.lg },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  noteDone: { opacity: 0.65 },
  noteBody: { fontSize: font.size.sm, lineHeight: 20 },
  noteBodyDone: { textDecorationLine: 'line-through', color: colors.inkSoft },
});
