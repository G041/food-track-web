import type { CategorySlug } from '@/lib/api';
import { isHttpUrl } from '@/lib/text';

export type RestaurantDraft = {
  menu_url: string;
  name: string;
  category: CategorySlug | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type DraftErrors = Partial<Record<keyof RestaurantDraft, string>>;

// Mismas reglas que los CHECK de public.restaurants
export function validateDraft(d: RestaurantDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!isHttpUrl(d.menu_url) || d.menu_url.length > 500) errors.menu_url = 'Tiene que ser un link http(s) válido.';
  const name = d.name.trim();
  if (name.length < 2 || name.length > 80) errors.name = 'El nombre debe tener entre 2 y 80 caracteres.';
  if (!d.category) errors.category = 'Elegí una categoría.';
  if (d.address.length > 160) errors.address = 'La dirección es demasiado larga.';
  if (d.latitude == null || d.longitude == null) errors.latitude = 'Marcá la ubicación en el mapa.';
  return errors;
}
