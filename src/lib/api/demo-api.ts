// Backend simulado para probar la app sin Supabase. Guarda todo en localStorage (web).
import { seedRestaurants } from './seed-data';
import { ApiError, type AdminNote, type Api, type Profile, type Restaurant, type Session } from './types';

type DemoUser = Profile & { email: string; password: string };
type DemoState = {
  restaurants: Restaurant[];
  users: DemoUser[];
  session: Session | null;
  nextId: number;
  notes?: AdminNote[];
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
  };
}
