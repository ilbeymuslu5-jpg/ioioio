import type { ListingFilters, ListingSummary } from "./types";

const TURKISH_LOCALE = "tr-TR";

function normalize(value: string): string {
  return value.toLocaleLowerCase(TURKISH_LOCALE).trim();
}

export function filterListings(
  listings: ListingSummary[],
  filters: ListingFilters,
): ListingSummary[] {
  const terms = normalize(filters.query ?? "")
    .split(/\s+/)
    .filter(Boolean);

  return listings.filter((listing) => {
    if (filters.group && listing.group !== filters.group) return false;
    if (filters.categorySlug && listing.categorySlug !== filters.categorySlug)
      return false;
    if (filters.listingType && listing.listingType !== filters.listingType) return false;

    if (terms.length > 0) {
      const haystack = normalize(
        [listing.title, listing.city, listing.district, listing.companyName].join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    }

    return true;
  });
}
