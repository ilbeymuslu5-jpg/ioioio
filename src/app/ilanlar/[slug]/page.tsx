import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/forms/form-alert";
import { Container } from "@/components/layout/container";
import { CategoryIcon } from "@/components/listings/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { formatNumber, formatPrice } from "@/lib/format";
import { fetchCategories, fetchListingBySlug } from "@/lib/listings/queries";
import type { ListingDetail } from "@/lib/listings/types";
import { toInternationalPhone } from "@/lib/phone";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

type ListingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ yeni?: string }>;
};

async function loadListing(slug: string): Promise<ListingDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const categories = await fetchCategories(supabase);
  return fetchListingBySlug(supabase, categories, slug);
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await loadListing(slug);
  if (!listing) return {};
  const location = [listing.district, listing.city].filter(Boolean).join(", ");
  const description = (listing.description ?? `${listing.title} · ${location}`).slice(
    0,
    160,
  );
  return {
    title: `${listing.title} · ${location}`,
    description,
    alternates: { canonical: routes.listing(listing.slug) },
    openGraph: { title: listing.title, description, images: listing.images.slice(0, 1) },
    robots:
      listing.status === "active" || listing.status === "reserved"
        ? undefined
        : { index: false },
  };
}

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const { slug } = await params;
  const { yeni } = await searchParams;
  const listing = await loadListing(slug);
  if (!listing) notFound();

  const t = await getTranslations("listingDetail");
  const tListing = await getTranslations("listing");
  const user = await getCurrentUser();
  const isOwner = user?.id === listing.company.ownerId;
  const isPublic = listing.status === "active" || listing.status === "reserved";
  const unit = tListing(`units.${listing.unit}`);
  const location = [listing.district, listing.city].filter(Boolean).join(", ");
  const phone = listing.company.phone;
  const internationalPhone = phone ? toInternationalPhone(phone) : null;
  const hasFixedPrice = listing.priceType === "fixed" && listing.price !== null;

  const specs: { label: string; value: string }[] = [
    { label: t("category"), value: listing.categoryName ?? "—" },
    {
      label: t("quantity"),
      value:
        listing.quantity !== null
          ? `${formatNumber(listing.quantity)} ${unit}`
          : tListing("quantityUnknown"),
    },
    { label: t("frequency"), value: tListing(`frequency.${listing.frequency}`) },
    { label: t("delivery"), value: tListing(`delivery.${listing.delivery}`) },
    ...(listing.group === "pallet"
      ? [
          ...(listing.condition
            ? [
                {
                  label: t("condition"),
                  value: tListing(`condition.${listing.condition}`),
                },
              ]
            : []),
          { label: t("ispm15"), value: listing.ispm15 ? t("yes") : t("no") },
          ...(listing.dimensions
            ? [{ label: t("dimensions"), value: listing.dimensions }]
            : []),
        ]
      : []),
    { label: t("location"), value: location },
    {
      label: t("publishedAt"),
      value: new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long",
        timeZone: "Europe/Istanbul",
      }).format(new Date(listing.createdAt)),
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description ?? undefined,
    image: listing.images,
    category: listing.categoryName,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}${routes.listing(listing.slug)}`,
      priceCurrency: "TRY",
      price: hasFixedPrice ? listing.price : listing.priceType === "free" ? 0 : undefined,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: listing.company.name },
      areaServed: listing.city,
    },
  };

  return (
    <Container className="py-6 sm:py-10">
      {isPublic && listing.listingType === "offer" ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <Link
        href={routes.listings}
        className="text-brand-dark inline-flex items-center gap-1 text-sm font-semibold hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("backToListings")}
      </Link>

      <div className="mt-4 flex flex-col gap-3">
        {yeni === "1" ? <FormAlert tone="success">{t("created")}</FormAlert> : null}
        {yeni === "onay" ? (
          <FormAlert tone="success">{t("createdPending")}</FormAlert>
        ) : null}
        {isOwner ? (
          <div className="border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <p className="text-ink flex flex-wrap items-center gap-2 text-sm">
              {isPublic ? t("ownerNotice") : t("notPublic")}
              <Badge variant="soft">{tListing(`status.${listing.status}`)}</Badge>
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={routes.panel}>{t("managePanel")}</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          {listing.images.length > 0 ? (
            <ul
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
              tabIndex={0}
            >
              {listing.images.map((url, index) => (
                <li
                  key={url}
                  className="bg-brand-soft border-line aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl border sm:w-[70%]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage görseli */}
                  <img
                    src={url}
                    alt={tListing("photoAlt", { title: listing.title })}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="size-full object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-brand-soft flex aspect-[16/7] items-center justify-center rounded-xl">
              <CategoryIcon
                slug={listing.categorySlug}
                className="text-brand-dark size-16 opacity-60"
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-1.5">
            <Badge variant={listing.listingType === "offer" ? "brand" : "outline"}>
              {tListing(`type.${listing.listingType}`)}
            </Badge>
            {listing.frequency !== "once" ? (
              <Badge variant="soft">{tListing(`frequency.${listing.frequency}`)}</Badge>
            ) : null}
            {listing.ispm15 ? <Badge>{tListing("ispm15")}</Badge> : null}
            {listing.priceType === "free" ? (
              <Badge>{tListing("price.free")}</Badge>
            ) : null}
          </div>
          <h1 className="text-ink mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {listing.title}
          </h1>
          <p className="text-ink-muted mt-2 flex items-center gap-1 text-sm">
            <MapPin aria-hidden="true" className="size-4" />
            {location}
          </p>

          <section aria-labelledby="specs-heading" className="mt-8">
            <h2 id="specs-heading" className="text-ink text-lg font-semibold">
              {t("specs")}
            </h2>
            <dl className="border-line mt-3 grid rounded-xl border sm:grid-cols-2">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="border-line flex justify-between gap-4 border-b px-4 py-3 text-sm last:border-b-0"
                >
                  <dt className="text-ink-muted">{spec.label}</dt>
                  <dd className="text-ink text-right font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="description-heading" className="mt-8">
            <h2 id="description-heading" className="text-ink text-lg font-semibold">
              {t("description")}
            </h2>
            <p className="text-ink mt-3 max-w-prose text-base whitespace-pre-line">
              {listing.description ?? (
                <span className="text-ink-muted">{t("noDescription")}</span>
              )}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-line shadow-soft rounded-xl border bg-white p-5">
            <p className="text-brand-dark text-2xl font-bold">
              {hasFixedPrice && listing.price !== null
                ? formatPrice(listing.price)
                : tListing(`price.${listing.priceType}`)}
              {hasFixedPrice ? (
                <span className="text-ink-muted ml-1 text-sm font-normal">
                  {tListing("perUnit", { unit })}
                </span>
              ) : null}
            </p>
            {listing.quantity !== null ? (
              <p className="text-ink-muted mt-1 text-sm">
                {formatNumber(listing.quantity)} {unit}
                {listing.frequency !== "once"
                  ? ` · ${tListing(`frequency.${listing.frequency}`)}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="border-line shadow-soft rounded-xl border bg-white p-5">
            <h2 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
              {t("company")}
            </h2>
            <p className="text-ink mt-2 flex items-center gap-1.5 text-lg font-semibold">
              {listing.company.name}
              {listing.company.isVerified ? (
                <BadgeCheck
                  role="img"
                  aria-label={tListing("verified")}
                  className="text-brand-dark size-5 shrink-0"
                />
              ) : null}
            </p>
            <p className="text-ink-muted mt-1 text-sm">
              {[listing.company.sector, listing.company.district, listing.company.city]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {listing.company.ratingCount > 0 ? (
              <p className="text-ink mt-2 flex items-center gap-1 text-sm font-medium">
                <Star aria-hidden="true" className="text-brand-dark size-4" />
                {formatNumber(listing.company.ratingAvg)} ({listing.company.ratingCount})
              </p>
            ) : null}

            {!isOwner ? (
              <div className="border-line mt-4 flex flex-col gap-2 border-t pt-4">
                <h3 className="text-ink text-sm font-semibold">{t("contactHeading")}</h3>
                {!user ? (
                  <Button asChild>
                    <Link
                      href={`${routes.login}?next=${encodeURIComponent(routes.listing(listing.slug))}`}
                    >
                      {t("loginToContact")}
                    </Link>
                  </Button>
                ) : phone ? (
                  <>
                    <Button asChild>
                      <a
                        href={`tel:${internationalPhone ? `+${internationalPhone}` : phone}`}
                      >
                        <Phone aria-hidden="true" />
                        {t("call")} · {phone}
                      </a>
                    </Button>
                    {internationalPhone ? (
                      <Button asChild variant="secondary">
                        <a
                          href={`https://wa.me/${internationalPhone}?text=${encodeURIComponent(
                            t("whatsappMessage", { title: listing.title }),
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle aria-hidden="true" />
                          {t("whatsapp")}
                        </a>
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-ink-muted text-sm">{t("noPhone")}</p>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </Container>
  );
}
