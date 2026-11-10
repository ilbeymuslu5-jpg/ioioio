import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  categoryIdsInGroup,
  categoryIdsUnderRoot,
  resolveCategory,
  type Category,
} from "@/lib/categories";
import {
  deliveryTypes,
  listingFrequencies,
  listingStatuses,
  listingTypes,
  listingUnits,
  palletConditions,
  priceTypes,
  type ListingDetail,
  type ListingFilters,
  type ListingSummary,
} from "./types";

// --- Kategoriler -----------------------------------------------------------

const categoryRowSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  slug: z.string(),
  name_tr: z.string(),
  type: z.enum(["pallet", "waste"]),
  sort_order: z.number(),
});

export async function fetchCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name_tr, type, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to load categories: ${error.message}`);

  return z
    .array(categoryRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      slug: row.slug,
      name: row.name_tr,
      group: row.type,
      sortOrder: row.sort_order,
    }));
}

// --- İlanlar ---------------------------------------------------------------

const attributesSchema = z
  .object({
    condition: z.enum(palletConditions).nullish(),
    ispm15: z.boolean().nullish(),
    dimensions: z.string().nullish(),
  })
  .loose();

const companyEmbedSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  slug: z.string(),
  is_verified: z.boolean(),
  phone: z.string().nullable(),
  city: z.string(),
  district: z.string().nullable(),
  sector: z.string().nullable(),
  rating_avg: z.coerce.number(),
  rating_count: z.coerce.number(),
});

const listingRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category_id: z.string(),
  listing_type: z.enum(listingTypes),
  title: z.string(),
  description: z.string().nullable(),
  quantity: z.coerce.number().nullable(),
  unit: z.enum(listingUnits),
  frequency: z.enum(listingFrequencies),
  price: z.coerce.number().nullable(),
  price_type: z.enum(priceTypes),
  delivery: z.enum(deliveryTypes),
  attributes: attributesSchema,
  city: z.string(),
  district: z.string().nullable(),
  status: z.enum(listingStatuses),
  created_at: z.string(),
  company: companyEmbedSchema,
  images: z.array(z.object({ url: z.string(), sort_order: z.number() })),
});

type ListingRow = z.infer<typeof listingRowSchema>;

const LISTING_COLUMNS = `
  id, slug, category_id, listing_type, title, description, quantity, unit, frequency,
  price, price_type, delivery, attributes, city, district, status, created_at,
  company:companies!listings_company_id_fkey!inner(id, owner_id, name, slug, is_verified, phone, city, district, sector, rating_avg, rating_count),
  images:listing_images(url, sort_order)
`;

function sortedImages(row: ListingRow): string[] {
  return [...row.images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => image.url);
}

function toSummary(row: ListingRow, categories: Category[]): ListingSummary {
  const resolved = resolveCategory(categories, row.category_id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    listingType: row.listing_type,
    group: resolved?.root.group ?? "waste",
    categorySlug: resolved?.rootSlug ?? "diger",
    categoryName: resolved?.category.name,
    quantity: row.quantity,
    unit: row.unit,
    frequency: row.frequency,
    priceType: row.price_type,
    price: row.price,
    city: row.city,
    district: row.district,
    companyName: row.company.name,
    isVerified: row.company.is_verified,
    ispm15: row.attributes.ispm15 === true,
    imageUrl: sortedImages(row)[0] ?? null,
    status: row.status,
  };
}

function toDetail(row: ListingRow, categories: Category[]): ListingDetail {
  return {
    ...toSummary(row, categories),
    slug: row.slug,
    status: row.status,
    description: row.description,
    delivery: row.delivery,
    condition: row.attributes.condition ?? null,
    dimensions: row.attributes.dimensions || null,
    images: sortedImages(row),
    createdAt: row.created_at,
    company: {
      id: row.company.id,
      ownerId: row.company.owner_id,
      name: row.company.name,
      slug: row.company.slug,
      isVerified: row.company.is_verified,
      phone: row.company.phone,
      city: row.company.city,
      district: row.company.district,
      sector: row.company.sector,
      ratingAvg: row.company.rating_avg,
      ratingCount: row.company.rating_count,
    },
  };
}

/** PostgREST `or` filtresini bozabilecek karakterleri temizler. */
function sanitizeSearchTerm(value: string): string {
  return value
    .replace(/[,()%*\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const PUBLIC_STATUSES = ["active", "reserved"] as const;

type FetchListingsOptions = ListingFilters & { limit?: number };

/** Yayındaki ilanlar (en yeni önce). */
export async function fetchPublicListings(
  supabase: SupabaseClient,
  categories: Category[],
  { limit = 60, ...filters }: FetchListingsOptions = {},
): Promise<ListingSummary[]> {
  let query = supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .in("status", [...PUBLIC_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.listingType) query = query.eq("listing_type", filters.listingType);

  if (filters.categorySlug) {
    query = query.in(
      "category_id",
      categoryIdsUnderRoot(categories, filters.categorySlug),
    );
  } else if (filters.group) {
    query = query.in("category_id", categoryIdsInGroup(categories, filters.group));
  }

  const term = sanitizeSearchTerm(filters.query ?? "");
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `title.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return z
    .array(listingRowSchema)
    .parse(data)
    .map((row) => toSummary(row, categories));
}

/** Tek ilan. RLS gereği yayında olmayan ilanı yalnızca sahibi ve admin görür. */
export async function fetchListingBySlug(
  supabase: SupabaseClient,
  categories: Category[],
  slug: string,
): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data ? toDetail(listingRowSchema.parse(data), categories) : null;
}

/** Bir firmanın tüm ilanları (panel için; her durumda). */
export async function fetchCompanyListings(
  supabase: SupabaseClient,
  categories: Category[],
  companyId: string,
): Promise<ListingSummary[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load company listings: ${error.message}`);
  return z
    .array(listingRowSchema)
    .parse(data)
    .map((row) => toSummary(row, categories));
}
