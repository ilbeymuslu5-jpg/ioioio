import type { CategoryGroup, CategorySlug } from "@/lib/categories";

export const listingTypes = ["offer", "request"] as const;
export const listingUnits = ["adet", "kg", "ton", "m3", "torba", "bigbag"] as const;
export const listingFrequencies = ["once", "weekly", "monthly"] as const;
export const priceTypes = ["fixed", "negotiable", "free"] as const;
export const deliveryTypes = ["pickup", "delivery", "negotiable"] as const;
export const palletConditions = ["new", "a", "b", "c", "scrap"] as const;
export const listingStatuses = [
  "draft",
  "pending",
  "active",
  "reserved",
  "completed",
  "removed",
] as const;

export type ListingType = (typeof listingTypes)[number];
export type ListingUnit = (typeof listingUnits)[number];
export type ListingFrequency = (typeof listingFrequencies)[number];
export type PriceType = (typeof priceTypes)[number];
export type DeliveryType = (typeof deliveryTypes)[number];
export type PalletCondition = (typeof palletConditions)[number];
export type ListingStatus = (typeof listingStatuses)[number];

/** İlan kartında gösterilen özet. */
export type ListingSummary = {
  id: string;
  /** Örnek ilanlarda yoktur; varsa kart ilan detayına bağlanır. */
  slug?: string;
  title: string;
  listingType: ListingType;
  group: CategoryGroup;
  categorySlug: CategorySlug;
  /** Alt kategori adı (veritabanından). Yoksa üst kategori adı gösterilir. */
  categoryName?: string;
  quantity: number | null;
  unit: ListingUnit;
  frequency: ListingFrequency;
  priceType: PriceType;
  price: number | null;
  city: string;
  district: string | null;
  companyName: string;
  isVerified: boolean;
  ispm15: boolean;
  imageUrl?: string | null;
  status?: ListingStatus;
};

export type ListingDetail = ListingSummary & {
  slug: string;
  status: ListingStatus;
  description: string | null;
  delivery: DeliveryType;
  condition: PalletCondition | null;
  dimensions: string | null;
  images: string[];
  createdAt: string;
  company: {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    isVerified: boolean;
    phone: string | null;
    city: string;
    district: string | null;
    sector: string | null;
    ratingAvg: number;
    ratingCount: number;
  };
};

export type ListingFilters = {
  query?: string;
  group?: CategoryGroup;
  categorySlug?: CategorySlug;
  listingType?: ListingType;
};
