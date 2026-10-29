import { create } from 'zustand';

export type SheetSnap = 'collapsed' | 'half' | 'full';

type MapSheet = {
  snap: SheetSnap;
  setSnap: (snap: SheetSnap) => void;
};

// Shared with the navbar so pressing Mapa also collapses an already active map.
export const useMapSheet = create<MapSheet>((set) => ({
  snap: 'half',
  setSnap: (snap) => set({ snap }),
}));
