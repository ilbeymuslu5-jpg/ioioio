/** Üst kategoriler (supabase/seed.sql ile aynı slug'lar). Adlar messages/tr.json → categories. */
export const rootCategories = [
  { slug: "palet", group: "pallet" },
  { slug: "ahsap", group: "waste" },
  { slug: "plastik", group: "waste" },
  { slug: "kagit-karton", group: "waste" },
  { slug: "tekstil", group: "waste" },
  { slug: "metal", group: "waste" },
  { slug: "cam", group: "waste" },
  { slug: "organik", group: "waste" },
] as const;

export type RootCategory = (typeof rootCategories)[number];
export type CategorySlug = RootCategory["slug"];
export type CategoryGroup = RootCategory["group"];

export function isCategorySlug(value: string): value is CategorySlug {
  return rootCategories.some((category) => category.slug === value);
}
