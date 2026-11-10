import type { CategoryGroup, CategorySlug } from "@/lib/categories";

export type ListingType = "offer" | "request";
export type ListingUnit = "adet" | "kg" | "ton" | "m3" | "torba" | "bigbag";
export type ListingFrequency = "once" | "weekly" | "monthly";
export type PriceType = "fixed" | "negotiable" | "free";

/** İlan kartında gösterilen özet. Veritabanı bağlanınca listings sorgusu bu şekli döndürecek. */
export type ListingSummary = {
  id: string;
  title: string;
  listingType: ListingType;
  group: CategoryGroup;
  categorySlug: CategorySlug;
  quantity: number;
  unit: ListingUnit;
  frequency: ListingFrequency;
  priceType: PriceType;
  price: number | null;
  city: string;
  district: string;
  companyName: string;
  isVerified: boolean;
  ispm15: boolean;
};

export type ListingFilters = {
  query?: string;
  group?: CategoryGroup;
  categorySlug?: CategorySlug;
  listingType?: ListingType;
};
