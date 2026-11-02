import { create } from 'zustand';

import type { CategorySlug } from '@/lib/api';

/** id es el del lugar en la base; permite al admin eliminarlo desde el modal. */
export type MenuTarget = { id?: number; name: string; url: string; category: CategorySlug };

type MenuViewer = {
  target: MenuTarget | null;
  open: (target: MenuTarget) => void;
  close: () => void;
};

/** Menú abierto en el modal de vista previa (montado una sola vez en el layout raíz). */
export const useMenuViewer = create<MenuViewer>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
