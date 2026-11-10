"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { resolveCategory } from "@/lib/categories";
import { fetchCategories } from "@/lib/listings/queries";
import { listingFormSchema, listingImageUrlsSchema } from "@/lib/listings/schema";
import { listingImagePublicPrefix } from "@/lib/listings/storage";
import { routes } from "@/lib/routes";
import { slugifyWithId } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type CreateListingResult = { error: string };

/** İlanı kaydeder ve ilan sayfasına yönlendirir. Hata olursa hata anahtarı döner. */
export async function createListingAction(
  rawValues: unknown,
  rawImageUrls: unknown,
): Promise<CreateListingResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "authRequired" };
  const company = await getCurrentCompany();
  if (!company) return { error: "companyRequired" };

  const parsed = listingFormSchema.safeParse(rawValues);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "generic" };
  const values = parsed.data;

  const imageUrls = listingImageUrlsSchema.safeParse(rawImageUrls);
  if (!imageUrls.success) return { error: "tooManyImages" };
  const allowedPrefix = listingImagePublicPrefix(company.id);
  if (!imageUrls.data.every((url) => url.startsWith(allowedPrefix))) {
    return { error: "imageInvalid" };
  }

  const supabase = await createClient();
  const categories = await fetchCategories(supabase);
  const resolved = resolveCategory(categories, values.categoryId);
  if (!resolved) return { error: "categoryRequired" };
  const isPallet = resolved.root.group === "pallet";

  const id = randomUUID();
  const slug = slugifyWithId(`${values.city} ${values.title}`, id);

  const { data: inserted, error } = await supabase
    .from("listings")
    .insert({
      id,
      company_id: company.id,
      category_id: values.categoryId,
      slug,
      listing_type: values.listingType,
      title: values.title,
      description: values.description || null,
      quantity: values.quantity,
      unit: isPallet ? "adet" : values.unit,
      frequency: values.frequency,
      price_type: values.priceType,
      price: values.priceType === "fixed" ? values.price : null,
      delivery: values.delivery,
      attributes: isPallet
        ? {
            condition: values.condition,
            ispm15: values.ispm15,
            dimensions: values.dimensions || null,
          }
        : {},
      city: values.city,
      district: values.district || null,
      // Onay gerekiyorsa veritabanı tetikleyicisi durumu 'pending' yapar.
      status: "active",
      is_hazardous_declared_false: values.notHazardous,
    })
    .select("status")
    .single();

  if (error) {
    console.error("createListingAction failed:", error.message);
    return { error: "listingSaveFailed" };
  }

  if (imageUrls.data.length > 0) {
    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(
        imageUrls.data.map((url, index) => ({ listing_id: id, url, sort_order: index })),
      );
    if (imageError) console.error("listing_images insert failed:", imageError.message);
  }

  revalidatePath(routes.listings);
  revalidatePath(routes.home);
  redirect(`${routes.listing(slug)}?yeni=${inserted.status === "active" ? "1" : "onay"}`);
}
