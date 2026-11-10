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
  { slug: "diger", group: "waste" },
] as const;

export type RootCategory = (typeof rootCategories)[number];
export type CategorySlug = RootCategory["slug"];
export type CategoryGroup = RootCategory["group"];

export function isCategorySlug(value: string): value is CategorySlug {
  return rootCategories.some((category) => category.slug === value);
}

/** Veritabanındaki kategori satırı (üst veya alt kategori). */
export type Category = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  group: CategoryGroup;
  sortOrder: number;
};

export type ResolvedCategory = {
  category: Category;
  root: Category;
  rootSlug: CategorySlug;
};

export function resolveCategory(
  categories: Category[],
  categoryId: string,
): ResolvedCategory | null {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;
  const root = category.parentId
    ? (categories.find((item) => item.id === category.parentId) ?? category)
    : category;
  return {
    category,
    root,
    rootSlug: isCategorySlug(root.slug) ? root.slug : "diger",
  };
}

/** Bir üst kategorinin kendisi ve tüm alt kategorilerinin id'leri. */
export function categoryIdsUnderRoot(categories: Category[], rootSlug: string): string[] {
  const root = categories.find(
    (item) => item.slug === rootSlug && item.parentId === null,
  );
  if (!root) return [];
  return [
    root.id,
    ...categories.filter((item) => item.parentId === root.id).map((item) => item.id),
  ];
}

export function categoryIdsInGroup(
  categories: Category[],
  group: CategoryGroup,
): string[] {
  return categories.filter((item) => item.group === group).map((item) => item.id);
}
