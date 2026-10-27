import { create } from 'zustand';

import type { CategorySlug } from '@/lib/api';

type MapFilters = {
  search: string;
  category: CategorySlug | null;
  selectedId: number | null;
  setSearch: (search: string) => void;
  setCategory: (category: CategorySlug | null) => void;
  select: (id: number | null) => void;
};

export const useMapFilters = create<MapFilters>((set) => ({
  search: '',
  category: null,
  selectedId: null,
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
}));
