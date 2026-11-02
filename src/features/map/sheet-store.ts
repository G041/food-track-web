import { create } from 'zustand';

export type SheetSnap = 'collapsed' | 'half' | 'full';

type MapSheet = {
  snap: SheetSnap;
  animated: boolean;
  presentation: number;
  reset: () => void;
  setSnap: (snap: SheetSnap, animated?: boolean) => void;
};

// Shared with the navbar so pressing Mapa also collapses an already active map.
export const useMapSheet = create<MapSheet>((set) => ({
  snap: 'collapsed',
  animated: false,
  presentation: 0,
  reset: () => set(state => ({ snap: 'collapsed', animated: false, presentation: state.presentation + 1 })),
  setSnap: (snap, animated = true) => set({ snap, animated }),
}));
