import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { filterListings } from "./filter";
import { fetchCategories, fetchPublicListings } from "./queries";
import { sampleListings } from "./sample";
import type { ListingFilters, ListingSummary } from "./types";

export type ListingsResult = {
  listings: ListingSummary[];
  /** true ise kurgusal örnek ilanlar gösteriliyor (veritabanı bağlı değil). */
  isSample: boolean;
};

/** Veritabanı bağlıysa gerçek ilanlar, değilse örnek ilanlar. */
export async function loadListings(
  filters: ListingFilters = {},
  limit?: number,
): Promise<ListingsResult> {
  if (!isSupabaseConfigured) {
    const listings = filterListings(sampleListings, filters);
    return { listings: limit ? listings.slice(0, limit) : listings, isSample: true };
  }

  const supabase = await createClient();
  const categories = await fetchCategories(supabase);
  const listings = await fetchPublicListings(supabase, categories, { ...filters, limit });
  return { listings, isSample: false };
}
