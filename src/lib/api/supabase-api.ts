import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { ApiError, type AdminNote, type Api, type PendingRestaurant, type RatingStats, type Restaurant } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export function createSupabaseApi(url: string, key: string): Api {
  const supabase = createClient(url, key, {
    auth: {
      // En web supabase-js usa localStorage por defecto.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  function fail(error: PostgrestError | { message: string; code?: string }): never {
    if (error.code === '23505') throw new ApiError('Ese menú ya fue cargado por alguien más.');
    if (error.code === 'P0001' || error.code === '42501') throw new ApiError(error.message);
    if (error.code === '23514') throw new ApiError('Algún dato no es válido. Revisá el formulario.');
    throw new ApiError('Algo salió mal. Probá de nuevo en un rato.');
  }

  function authFail(message: string): never {
    if (/invalid login credentials/i.test(message)) throw new ApiError('Usuario o contraseña incorrectos.');
    if (/email not confirmed/i.test(message)) throw new ApiError('Confirmá tu email antes de ingresar.');
    if (/already registered/i.test(message)) throw new ApiError('Ese email ya tiene una cuenta.');
    if (/password/i.test(message)) throw new ApiError('La contraseña debe tener al menos 6 caracteres.');
    throw new ApiError(message);
  }

  return {
    async listApproved() {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('status', 'approved')
        .order('name');
      if (error) fail(error);
      return data as Restaurant[];
    },

    async listMine(userId) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false });
      if (error) fail(error);
      return data as Restaurant[];
    },

    async listPending() {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, submitter:profiles!restaurants_submitted_by_fkey(username)')
        .eq('status', 'pending')
        .order('created_at');
      if (error) fail(error);
      return (data ?? []).map(({ submitter, ...r }) => ({
        ...r,
        submitter: (submitter as { username: string } | null)?.username ?? null,
      })) as PendingRestaurant[];
    },

    async submit(input) {
      const { data, error } = await supabase.from('restaurants').insert(input).select().single();
      if (error) fail(error);
      return data as Restaurant;
    },

    async withdraw(id) {
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) fail(error);
    },

    async review(id, decision, note) {
      const { error } = await supabase.rpc('review_restaurant', {
        p_id: id,
        p_decision: decision,
        p_note: note ?? null,
      });
      if (error) fail(error);
    },

    async ratingStats() {
      const { data, error } = await supabase.from('restaurant_rating_stats').select('restaurant_id, average, count');
      if (error) fail(error);
      const out: Record<number, RatingStats> = {};
      for (const r of data ?? []) out[r.restaurant_id] = { average: r.average, count: r.count };
      return out;
    },

    async myRatings() {
      const { data, error } = await supabase.from('ratings').select('restaurant_id, stars');
      if (error) fail(error);
      return Object.fromEntries((data ?? []).map((r) => [r.restaurant_id, r.stars]));
    },

    async rate(restaurantId, stars) {
      const { error } =
        stars === null
          ? await supabase.from('ratings').delete().eq('restaurant_id', restaurantId)
          : await supabase.from('ratings').upsert({ restaurant_id: restaurantId, stars }, { onConflict: 'restaurant_id,user_id' });
      if (error) fail(error);
    },

    async myFavorites() {
      const { data, error } = await supabase.from('favorites').select('restaurant_id');
      if (error) fail(error);
      return (data ?? []).map((r) => r.restaurant_id as number);
    },

    async setFavorite(restaurantId, on) {
      const { error } = on
        ? await supabase
            .from('favorites')
            .upsert({ restaurant_id: restaurantId }, { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true })
        : await supabase.from('favorites').delete().eq('restaurant_id', restaurantId);
      if (error) fail(error);
    },

    async listNotes() {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('id, body, done, created_at, author:profiles!admin_notes_created_by_fkey(username)')
        .order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(({ author, ...n }) => ({
        ...n,
        author: (author as unknown as { username: string } | null)?.username ?? null,
      })) as AdminNote[];
    },

    async addNote(body) {
      const { error } = await supabase.from('admin_notes').insert({ body: body.trim() });
      if (error) fail(error);
    },

    async setNoteDone(id, done) {
      const { error } = await supabase.from('admin_notes').update({ done }).eq('id', id);
      if (error) fail(error);
    },

    async deleteNote(id) {
      const { error } = await supabase.from('admin_notes').delete().eq('id', id);
      if (error) fail(error);
    },

    async getSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      return user ? { userId: user.id, email: user.email ?? '' } : null;
    },

    onSessionChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        cb(user ? { userId: user.id, email: user.email ?? '' } : null);
      });
      return () => data.subscription.unsubscribe();
    },

    async getProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, points')
        .eq('id', userId)
        .maybeSingle();
      if (error) fail(error);
      return data;
    },

    async signIn(identifier, password) {
      const id = identifier.trim();
      if (id.includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({ email: id, password });
        if (error) authFail(error.message);
        return;
      }
      // Con nombre de usuario: el servidor busca el email y hace el login, sin exponerlo al cliente.
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: id, password }),
        });
      } catch {
        throw new ApiError('No pudimos conectar. Probá de nuevo.');
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.access_token) {
        throw new ApiError(body?.error ?? 'Por ahora ingresá con tu email.');
      }
      const { error } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (error) authFail(error.message);
    },

    async signUp(email, username, password) {
      const { data: available, error: rpcError } = await supabase.rpc('username_available', {
        p_username: username,
      });
      if (rpcError) fail(rpcError);
      if (!available) throw new ApiError('Ese nombre de usuario ya está en uso.');

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username } },
      });
      if (error) authFail(error.message);
      return { needsConfirmation: !data.session };
    },

    async signOut() {
      await supabase.auth.signOut();
    },
  };
}
