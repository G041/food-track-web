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
  role: 'user' | 'admin';
  points: number;
};

export type Session = { userId: string; email: string };

export type ReviewDecision = 'approved' | 'rejected';

export interface Api {
  listApproved(): Promise<Restaurant[]>;
  listMine(userId: string): Promise<Restaurant[]>;
  listPending(): Promise<PendingRestaurant[]>;
  submit(input: NewRestaurant): Promise<Restaurant>;
  withdraw(id: number): Promise<void>;
  review(id: number, decision: ReviewDecision, note?: string): Promise<void>;

  getSession(): Promise<Session | null>;
  onSessionChange(cb: (session: Session | null) => void): () => void;
  getProfile(userId: string): Promise<Profile | null>;
  /** identifier: email o nombre de usuario. */
  signIn(identifier: string, password: string): Promise<void>;
  /** Devuelve true si el usuario tiene que confirmar su email antes de entrar. */
  signUp(email: string, username: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
}

/** Error con mensaje listo para mostrar al usuario. */
export class ApiError extends Error {}
