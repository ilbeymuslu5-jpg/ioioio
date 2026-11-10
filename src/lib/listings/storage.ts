import { supabaseUrl } from "@/lib/env";

export const LISTING_IMAGES_BUCKET = "listing-images";

/** Bir firmanın ilan fotoğraflarının açık adres öneki. Dosya yolu: <company_id>/<dosya>. */
export function listingImagePublicPrefix(companyId: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${companyId}/`;
}
