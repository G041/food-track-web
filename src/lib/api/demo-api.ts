// Backend simulado para probar la app sin Supabase. Guarda todo en localStorage (web).
import { seedRestaurants } from './seed-data';
import {
  ApiError,
  type AdminNote,
  type Api,
  type Profile,
  type ReportReason,
  type Restaurant,
  type Session,
} from './types';

type DemoUser = Profile & { email: string; password: string };
type DemoState = {
  restaurants: Restaurant[];
  users: DemoUser[];
  session: Session | null;
  nextId: number;
  notes?: AdminNote[];
  /** userId → restaurantId → estrellas */
  ratings?: Record<string, Record<number, number>>;
  favorites?: Record<string, number[]>;
  reports?: { id: number; restaurant_id: number; reported_by: string; reason: ReportReason; detail: string | null; status: 'open' | 'resolved'; created_at: string }[];
};

const STORAGE_KEY = 'foodtrack-demo-v1';
export const DEMO_ADMIN = { email: 'admin@foodtrack.demo', password: 'admin1234' };

function initialState(): DemoState {
  const now = new Date().toISOString();
  return {
    restaurants: seedRestaurants.map((r, i) => ({
      ...r,
      id: i + 1,
      status: 'approved',
      submitted_by: null,
      reviewed_at: now,
      review_note: null,
      created_at: now,
    })),
    users: [
      { id: 'demo-admin', username: 'admin', role: 'admin', points: 0, ...DEMO_ADMIN },
    ],
    session: null,
    nextId: seedRestaurants.length + 1,
  };
}

function load(): DemoState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {}
  return initialState();
}

export function createDemoApi(): Api {
  const state = load();
  const listeners = new Set<(s: Session | null) => void>();

  const save = () => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };
  const setSession = (s: Session | null) => {
    state.session = s;
    save();
    listeners.forEach((cb) => cb(s));
  };
  const me = () => state.users.find((u) => u.id === state.session?.userId);
  const delay = () => new Promise((r) => setTimeout(r, 250));

  return {
    async listApproved() {
      await delay();
      return state.restaurants.filter((r) => r.status === 'approved');
    },

    async listMine(userId) {
      await delay();
      return state.restaurants
        .filter((r) => r.submitted_by === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async listPending() {
      await delay();
      return state.restaurants
        .filter((r) => r.status === 'pending')
        .map((r) => ({ ...r, submitter: state.users.find((u) => u.id === r.submitted_by)?.username ?? null }));
    },

    async submit(input) {
      await delay();
      const user = me();
      if (!user) throw new ApiError('Tenés que ingresar para aportar.');
      if (user.role === 'banned') throw new ApiError('Tu cuenta está bloqueada por incumplir los términos de uso');
      const url = input.menu_url.toLowerCase();
      if (state.restaurants.some((r) => r.status !== 'rejected' && r.menu_url.toLowerCase() === url)) {
        throw new ApiError('Ese menú ya fue cargado por alguien más.');
      }
      const now = new Date().toISOString();
      const isAdmin = user.role === 'admin';
      const restaurant: Restaurant = {
        ...input,
        id: state.nextId++,
        status: isAdmin ? 'approved' : 'pending',
        submitted_by: user.id,
        reviewed_at: isAdmin ? now : null,
        review_note: null,
        created_at: now,
      };
      state.restaurants.push(restaurant);
      save();
      return restaurant;
    },

    async withdraw(id) {
      await delay();
      state.restaurants = state.restaurants.filter(
        (r) => !(r.id === id && r.status === 'pending' && r.submitted_by === state.session?.userId),
      );
      save();
    },

    async review(id, decision, note) {
      await delay();
      if (me()?.role !== 'admin') throw new ApiError('Solo un administrador puede revisar aportes.');
      const r = state.restaurants.find((x) => x.id === id);
      if (!r) throw new ApiError('Ese aporte ya no existe.');
      r.status = decision;
      r.reviewed_at = new Date().toISOString();
      r.review_note = note?.trim() || null;
      const author = state.users.find((u) => u.id === r.submitted_by);
      if (decision === 'approved' && author) author.points += 10;
      save();
    },

    async ratingStats() {
      const acc: Record<number, { sum: number; count: number }> = {};
      for (const byRestaurant of Object.values(state.ratings ?? {})) {
        for (const [id, stars] of Object.entries(byRestaurant)) {
          const a = (acc[Number(id)] ??= { sum: 0, count: 0 });
          a.sum += stars;
          a.count += 1;
        }
      }
      return Object.fromEntries(
        Object.entries(acc).map(([id, a]) => [id, { average: Math.round((a.sum / a.count) * 100) / 100, count: a.count }]),
      );
    },

    async myRatings() {
      return { ...(state.ratings?.[state.session?.userId ?? ''] ?? {}) };
    },

    async rate(restaurantId, stars) {
      await delay();
      const uid = state.session?.userId;
      if (!uid) throw new ApiError('Ingresá para calificar.');
      const mine = { ...(state.ratings?.[uid] ?? {}) };
      if (stars === null) delete mine[restaurantId];
      else mine[restaurantId] = stars;
      state.ratings = { ...(state.ratings ?? {}), [uid]: mine };
      save();
    },

    async myFavorites() {
      return [...(state.favorites?.[state.session?.userId ?? ''] ?? [])];
    },

    async setFavorite(restaurantId, on) {
      const uid = state.session?.userId;
      if (!uid) throw new ApiError('Ingresá para guardar favoritos.');
      const set = new Set(state.favorites?.[uid] ?? []);
      if (on) set.add(restaurantId);
      else set.delete(restaurantId);
      state.favorites = { ...(state.favorites ?? {}), [uid]: [...set] };
      save();
    },

    async listNotes() {
      await delay();
      if (me()?.role !== 'admin') return [];
      return [...(state.notes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async addNote(body) {
      await delay();
      const user = me();
      if (user?.role !== 'admin') throw new ApiError('Solo los administradores pueden crear notas.');
      if (!body.trim()) throw new ApiError('La nota está vacía.');
      state.notes = [
        ...(state.notes ?? []),
        { id: Date.now(), body: body.trim(), done: false, created_at: new Date().toISOString(), author: user.username },
      ];
      save();
    },

    async setNoteDone(id, done) {
      await delay();
      state.notes = (state.notes ?? []).map((n) => (n.id === id ? { ...n, done } : n));
      save();
    },

    async deleteNote(id) {
      await delay();
      state.notes = (state.notes ?? []).filter((n) => n.id !== id);
      save();
    },

    async report(restaurantId, reason, detail) {
      await delay();
      const user = me();
      if (!user) throw new ApiError('Ingresá para reportar un lugar.');
      if (user.role === 'banned') throw new ApiError('Tu cuenta está bloqueada por incumplir los términos de uso');
      const reports = state.reports ?? [];
      if (reports.some((r) => r.restaurant_id === restaurantId && r.reported_by === user.id && r.status === 'open')) {
        throw new ApiError('Ya reportaste este lugar. Lo estamos revisando.');
      }
      state.reports = [
        ...reports,
        {
          id: Date.now(),
          restaurant_id: restaurantId,
          reported_by: user.id,
          reason,
          detail: detail?.trim() || null,
          status: 'open',
          created_at: new Date().toISOString(),
        },
      ];
      save();
    },

    async listReports() {
      await delay();
      if (me()?.role !== 'admin') return [];
      const username = (id: string | null) => state.users.find((u) => u.id === id)?.username ?? null;
      return (state.reports ?? [])
        .filter((r) => r.status === 'open')
        .flatMap((r) => {
          const x = state.restaurants.find((rr) => rr.id === r.restaurant_id);
          if (!x) return [];
          const submitter = state.users.find((u) => u.id === x.submitted_by);
          return [
            {
              id: r.id,
              reason: r.reason,
              detail: r.detail,
              created_at: r.created_at,
              reporter: username(r.reported_by),
              restaurant: {
                id: x.id,
                name: x.name,
                menu_url: x.menu_url,
                category: x.category,
                submitted_by: x.submitted_by,
                submitter: submitter?.username ?? null,
                submitterBanned: submitter?.role === 'banned',
              },
            },
          ];
        });
    },

    async resolveReport(id) {
      await delay();
      state.reports = (state.reports ?? []).map((r) => (r.id === id ? { ...r, status: 'resolved' as const } : r));
      save();
    },

    async setUserBanned(userId, banned) {
      await delay();
      if (me()?.role !== 'admin') throw new ApiError('Solo un administrador puede bloquear usuarios');
      const u = state.users.find((x) => x.id === userId);
      if (!u || u.role === 'admin') throw new ApiError('No se puede bloquear a ese usuario');
      u.role = banned ? 'banned' : 'user';
      save();
    },

    async getSession() {
      return state.session;
    },

    onSessionChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async getProfile(userId) {
      const u = state.users.find((x) => x.id === userId);
      return u ? { id: u.id, username: u.username, role: u.role, points: u.points } : null;
    },

    async signIn(identifier, password) {
      await delay();
      const id = identifier.trim().toLowerCase();
      const u = state.users.find((x) => x.email === id || x.username.toLowerCase() === id);
      if (!u || u.password !== password) throw new ApiError('Usuario o contraseña incorrectos.');
      setSession({ userId: u.id, email: u.email });
    },

    async signUp(email, username, password) {
      await delay();
      const mail = email.trim().toLowerCase();
      if (state.users.some((u) => u.email === mail)) throw new ApiError('Ese email ya tiene una cuenta.');
      if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        throw new ApiError('Ese nombre de usuario ya está en uso.');
      }
      if (password.length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres.');
      const user: DemoUser = { id: `demo-${Date.now()}`, username, role: 'user', points: 0, email: mail, password };
      state.users.push(user);
      setSession({ userId: user.id, email: mail });
      return { needsConfirmation: false };
    },

    async signOut() {
      setSession(null);
    },

    async requestPasswordReset() {
      await delay();
      throw new ApiError('En el modo demo no se mandan emails.');
    },

    async updatePassword(password) {
      await delay();
      const user = me();
      if (!user) throw new ApiError('El link venció. Pedí uno nuevo.');
      if (password.length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres.');
      user.password = password;
      save();
    },

    async deleteAccount() {
      await delay();
      const uid = state.session?.userId;
      if (!uid) throw new ApiError('Ingresá de nuevo para borrar tu cuenta.');
      state.users = state.users.filter((u) => u.id !== uid);
      state.restaurants = state.restaurants
        .filter((r) => !(r.submitted_by === uid && r.status !== 'approved'))
        .map((r) => (r.submitted_by === uid ? { ...r, submitted_by: null } : r));
      if (state.ratings) delete state.ratings[uid];
      if (state.favorites) delete state.favorites[uid];
      setSession(null);
    },
  };
}
