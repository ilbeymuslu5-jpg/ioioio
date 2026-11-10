import type { Metadata } from "next";
import Link from "next/link";
import { Info, Plus, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { FilterChips, type FilterChip } from "@/components/listings/filter-chips";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchForm } from "@/components/listings/search-form";
import { Button } from "@/components/ui/button";
import { isCategorySlug, rootCategories } from "@/lib/categories";
import { loadListings } from "@/lib/listings/load";
import type { ListingFilters } from "@/lib/listings/types";
import { routes } from "@/lib/routes";

type SearchParams = Record<string, string | string[] | undefined>;

type ListingsPageProps = {
  searchParams: Promise<SearchParams>;
};

/** URL parametreleri Türkçe: ?q=...&tip=palet|atik&kategori=<slug>&ilan=veriyorum|ariyorum */
type UrlFilters = {
  q?: string;
  tip?: string;
  kategori?: string;
  ilan?: string;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(current: UrlFilters, patch: UrlFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${routes.listings}?${query}` : routes.listings;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listingsPage");
  return { title: t("title"), description: t("description") };
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams;
  const t = await getTranslations("listingsPage");
  const tCategory = await getTranslations("categories");

  const url: UrlFilters = {
    q: first(params.q)?.trim() || undefined,
    tip: first(params.tip),
    kategori: first(params.kategori),
    ilan: first(params.ilan),
  };

  const filters: ListingFilters = {
    query: url.q,
    group: url.tip === "palet" ? "pallet" : url.tip === "atik" ? "waste" : undefined,
    categorySlug: url.kategori && isCategorySlug(url.kategori) ? url.kategori : undefined,
    listingType:
      url.ilan === "veriyorum"
        ? "offer"
        : url.ilan === "ariyorum"
          ? "request"
          : undefined,
  };

  const { listings, isSample } = await loadListings(filters);
  const hasFilters = Boolean(
    filters.query || filters.group || filters.categorySlug || filters.listingType,
  );

  const groupChips: FilterChip[] = [
    {
      label: t("filters.all"),
      href: buildHref(url, { tip: undefined, kategori: undefined }),
      isActive: !filters.group && !filters.categorySlug,
    },
    {
      label: t("filters.pallet"),
      href: buildHref(url, { tip: "palet", kategori: undefined }),
      isActive: filters.group === "pallet" && !filters.categorySlug,
    },
    {
      label: t("filters.waste"),
      href: buildHref(url, { tip: "atik", kategori: undefined }),
      isActive: filters.group === "waste" && !filters.categorySlug,
    },
    ...rootCategories
      .filter((category) => category.group === "waste" && category.slug !== "diger")
      .map((category) => ({
        label: tCategory(category.slug),
        href: buildHref(url, { tip: undefined, kategori: category.slug }),
        isActive: filters.categorySlug === category.slug,
      })),
  ];

  const typeChips: FilterChip[] = [
    {
      label: t("filters.allTypes"),
      href: buildHref(url, { ilan: undefined }),
      isActive: !filters.listingType,
    },
    {
      label: t("filters.offer"),
      href: buildHref(url, { ilan: "veriyorum" }),
      isActive: filters.listingType === "offer",
    },
    {
      label: t("filters.request"),
      href: buildHref(url, { ilan: "ariyorum" }),
      isActive: filters.listingType === "request",
    },
  ];

  return (
    <>
      <section className="bg-brand-soft">
        <Container className="py-8 sm:py-10">
          <h1 className="text-brand-dark text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-ink-muted mt-1 text-sm sm:text-base">{t("description")}</p>
          <SearchForm
            id="listings-search"
            defaultValue={url.q}
            hiddenParams={{ tip: url.tip, kategori: url.kategori, ilan: url.ilan }}
            className="mt-5 max-w-2xl"
          />
        </Container>
      </section>

      <Container className="flex flex-col gap-6 py-8">
        {isSample ? (
          <p className="border-line text-ink flex items-start gap-3 rounded-xl border p-4 text-sm">
            <Info aria-hidden="true" className="text-brand-dark mt-0.5 size-5 shrink-0" />
            {t("sampleNotice")}
          </p>
        ) : null}

        <div className="flex flex-col gap-4">
          <FilterChips label={t("filters.categoryLabel")} chips={groupChips} />
          <FilterChips label={t("filters.typeLabel")} chips={typeChips} />
        </div>

        <p className="text-ink-muted text-sm" aria-live="polite">
          {t(isSample ? "resultCount" : "resultCountReal", { count: listings.length })}
        </p>

        {listings.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <li key={listing.id} className="flex">
                <ListingCard listing={listing} isSample={isSample} className="w-full" />
              </li>
            ))}
          </ul>
        ) : !isSample && !hasFilters ? (
          <div className="border-line flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
            <h2 className="text-ink text-lg font-semibold">{t("noListings.title")}</h2>
            <p className="text-ink-muted max-w-sm text-sm">
              {t("noListings.description")}
            </p>
            <Button asChild>
              <Link href={routes.newListing}>
                <Plus aria-hidden="true" />
                {t("noListings.cta")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border-line flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
            <SearchX aria-hidden="true" className="text-ink-muted size-10" />
            <h2 className="text-ink text-lg font-semibold">{t("empty.title")}</h2>
            <p className="text-ink-muted max-w-sm text-sm">{t("empty.description")}</p>
            <Button asChild variant="secondary" size="sm">
              <Link href={routes.listings}>{t("empty.reset")}</Link>
            </Button>
          </div>
        )}
      </Container>
    </>
  );
}
