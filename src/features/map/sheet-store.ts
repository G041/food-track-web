import { create } from 'zustand';

export type SheetSnap = 'collapsed' | 'half' | 'full';

type MapSheet = {
  snap: SheetSnap;
  setSnap: (snap: SheetSnap) => void;
};

// Shared with the navbar so pressing Mapa also collapses an already active map.
// Arranca escondido: el panel solo se abre cuando el usuario lo arrastra hacia arriba.
export const useMapSheet = create<MapSheet>((set) => ({
  snap: 'collapsed',
  setSnap: (snap) => set({ snap }),
}));
