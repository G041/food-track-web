import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { CategorySlug } from '@/lib/api/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type CategoryMeta = { slug: CategorySlug; name: string; icon: IconName; color: string };

// Debe coincidir con la tabla public.categories (supabase/migrations)
export const CATEGORIES: CategoryMeta[] = [
  { slug: 'restaurante', name: 'Restaurante', icon: 'restaurant', color: '#E4572E' },
  { slug: 'bar', name: 'Bar', icon: 'beer', color: '#7A4EC7' },
  { slug: 'merienda', name: 'Merienda', icon: 'cafe', color: '#C27C2C' },
  { slug: 'bodegon', name: 'Bodegón', icon: 'wine', color: '#A3324A' },
  { slug: 'comida-rapida', name: 'Comida rápida', icon: 'fast-food', color: '#2F8F5B' },
];

const bySlug = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c])) as Record<
  CategorySlug,
  CategoryMeta
>;

export function categoryMeta(slug: CategorySlug): CategoryMeta {
  return bySlug[slug] ?? CATEGORIES[0];
}
