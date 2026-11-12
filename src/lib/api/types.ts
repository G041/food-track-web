export type CategorySlug = 'restaurante' | 'bar' | 'merienda' | 'bodegon' | 'comida-rapida';

export type RestaurantStatus = 'pending' | 'approved' | 'rejected';

export type Restaurant = {
  id: number;
  name: string;
  category: CategorySlug;
  address: string | null;
  menu_url: string;
  latitude: number;
  longitude: number;
  status: RestaurantStatus;
  submitted_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  /** Última edición. La revisión de un admin la manda de vuelta para aprobar solo lo que vio. */
  updated_at?: string;
};

export type PendingRestaurant = Restaurant & { submitter: string | null };

export type RestaurantSeed = Pick<
  Restaurant,
  'name' | 'category' | 'address' | 'menu_url' | 'latitude' | 'longitude'
>;

export type NewRestaurant = RestaurantSeed;

export type Profile = {
  id: string;
  username: string;
  /** banned: puede ver el mapa, pero no aportar, calificar ni reportar. */
  role: 'user' | 'admin' | 'banned';
  points: number;
};

export type Session = { userId: string; email: string };

export type ReviewDecision = 'approved' | 'rejected';

export type RatingStats = { average: number; count: number };

/** Nota interna del equipo (solo admins). */
export type AdminNote = {
  id: number;
  body: string;
  done: boolean;
  created_at: string;
  author: string | null;
};

export type ReportReason = 'menu_roto' | 'cerrado' | 'datos_incorrectos' | 'inapropiado' | 'otro';

/** Reporte abierto, como lo ve el admin. */
export type OpenReport = {
  id: number;
  reason: ReportReason;
  detail: string | null;
  created_at: string;
  reporter: string | null;
  restaurant: Pick<Restaurant, 'id' | 'name' | 'menu_url' | 'category' | 'submitted_by'> & {
    submitter: string | null;
    submitterBanned: boolean;
  };
};

export interface Api {
  listApproved(): Promise<Restaurant[]>;
  listMine(userId: string): Promise<Restaurant[]>;
  listPending(): Promise<PendingRestaurant[]>;
  submit(input: NewRestaurant): Promise<Restaurant>;
  withdraw(id: number): Promise<void>;
  /** Solo admin: borra un lugar de la base (también sus calificaciones, favoritos y reportes). */
  deleteRestaurant(id: number): Promise<void>;
  /** seenAt: updated_at del aporte tal como lo vio el admin; si cambió desde entonces, la revisión falla. */
  review(id: number, decision: ReviewDecision, note?: string, seenAt?: string): Promise<void>;

  /** Promedio y cantidad de estrellas por restaurante (público). */
  ratingStats(): Promise<Record<number, RatingStats>>;
  /** Estrellas que puso el usuario logueado, por restaurante. */
  myRatings(): Promise<Record<number, number>>;
  /** stars null = quitar la calificación. */
  rate(restaurantId: number, stars: number | null): Promise<void>;
  myFavorites(): Promise<number[]>;
  setFavorite(restaurantId: number, on: boolean): Promise<void>;

  listNotes(): Promise<AdminNote[]>;
  addNote(body: string): Promise<void>;
  setNoteDone(id: number, done: boolean): Promise<void>;
  deleteNote(id: number): Promise<void>;

  report(restaurantId: number, reason: ReportReason, detail?: string): Promise<void>;
  listReports(): Promise<OpenReport[]>;
  resolveReport(id: number): Promise<void>;
  setUserBanned(userId: string, banned: boolean): Promise<void>;

  getSession(): Promise<Session | null>;
  onSessionChange(cb: (session: Session | null) => void): () => void;
  getProfile(userId: string): Promise<Profile | null>;
  /**
   * identifier: email o nombre de usuario.
   * captchaToken (acá y abajo): verificación anti-bots de un solo uso (components/captcha), si está configurada.
   */
  signIn(identifier: string, password: string, captchaToken?: string): Promise<void>;
  /** Devuelve true si el usuario tiene que confirmar su email antes de entrar. */
  signUp(email: string, username: string, password: string, captchaToken?: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  /** Manda el email con el link para elegir una contraseña nueva. */
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>;
  /** Cambia la contraseña del usuario logueado (también tras abrir el link de recuperación). */
  updatePassword(password: string): Promise<void>;
  /** Borra la cuenta y sus datos personales. Sus lugares publicados quedan sin autor. */
  deleteAccount(): Promise<void>;
}

/** Error con mensaje listo para mostrar al usuario. */
export class ApiError extends Error {}
