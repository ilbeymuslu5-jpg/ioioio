import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, LogOut, MapPin, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/app/auth/actions";
import { updateListingStatusAction } from "@/app/panel/actions";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCompany } from "@/lib/auth/session";
import { formatNumber } from "@/lib/format";
import { fetchCategories, fetchCompanyListings } from "@/lib/listings/queries";
import type { ListingStatus } from "@/lib/listings/types";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel");
  return { title: t("title"), robots: { index: false } };
}

type StatusAction = {
  status: "active" | "reserved" | "completed" | "removed";
  labelKey: "markActive" | "markReserved" | "markCompleted" | "remove";
};

/** Sahibinin her durumda yapabileceği geçişler (veritabanı tetikleyicisiyle uyumlu). */
const ACTIONS: Record<ListingStatus, StatusAction[]> = {
  draft: [
    { status: "active", labelKey: "markActive" },
    { status: "removed", labelKey: "remove" },
  ],
  pending: [{ status: "removed", labelKey: "remove" }],
  active: [
    { status: "reserved", labelKey: "markReserved" },
    { status: "completed", labelKey: "markCompleted" },
    { status: "removed", labelKey: "remove" },
  ],
  reserved: [
    { status: "active", labelKey: "markActive" },
    { status: "completed", labelKey: "markCompleted" },
    { status: "removed", labelKey: "remove" },
  ],
  completed: [{ status: "removed", labelKey: "remove" }],
  removed: [],
};

export default async function PanelPage() {
  const { company } = await requireCompany(routes.panel);
  const t = await getTranslations("panel");
  const tListing = await getTranslations("listing");
  const supabase = await createClient();
  const categories = await fetchCategories(supabase);
  const listings = await fetchCompanyListings(supabase, categories, company.id);

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-brand-dark text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden="true" />
            {t("signOut")}
          </Button>
        </form>
      </div>

      <section
        aria-labelledby="company-heading"
        className="border-line flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="bg-brand-light text-brand-dark flex size-12 shrink-0 items-center justify-center rounded-xl"
          >
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0">
            <h2
              id="company-heading"
              className="text-ink-muted text-xs font-semibold tracking-wide uppercase"
            >
              {t("companyHeading")}
            </h2>
            <p className="text-ink flex items-center gap-1.5 text-lg font-semibold">
              <span className="truncate">{company.name}</span>
              {company.isVerified ? (
                <BadgeCheck
                  role="img"
                  aria-label={t("verified")}
                  className="text-brand-dark size-5 shrink-0"
                />
              ) : null}
            </p>
            <p className="text-ink-muted flex items-center gap-1 text-sm">
              <MapPin aria-hidden="true" className="size-3.5" />
              {[company.district, company.city].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={routes.companySetup}>{t("editCompany")}</Link>
        </Button>
      </section>

      <section aria-labelledby="listings-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="listings-heading" className="text-ink text-xl font-bold">
            {t("listingsHeading")}
          </h2>
          <Button asChild size="sm">
            <Link href={routes.newListing}>
              <Plus aria-hidden="true" />
              {t("newListing")}
            </Link>
          </Button>
        </div>

        {listings.length === 0 ? (
          <div className="border-line mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
            <h3 className="text-ink text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="text-ink-muted text-sm">{t("emptyDescription")}</p>
            <Button asChild>
              <Link href={routes.newListing}>
                <Plus aria-hidden="true" />
                {t("newListing")}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="border-line mt-4 divide-y rounded-xl border">
            {listings.map((listing) => {
              const status = listing.status ?? "active";
              return (
                <li
                  key={listing.id}
                  className="border-line flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={status === "active" ? "brand" : "outline"}>
                        {tListing(`status.${status}`)}
                      </Badge>
                      <Badge variant="soft">
                        {tListing(`type.${listing.listingType}`)}
                      </Badge>
                    </div>
                    <p className="text-ink mt-1.5 font-semibold">{listing.title}</p>
                    <p className="text-ink-muted text-sm">
                      {[
                        listing.categoryName,
                        listing.quantity !== null
                          ? `${formatNumber(listing.quantity)} ${tListing(`units.${listing.unit}`)}`
                          : null,
                        listing.city,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {listing.slug && status !== "removed" ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={routes.listing(listing.slug)}>{t("view")}</Link>
                      </Button>
                    ) : null}
                    {ACTIONS[status].map((action) => (
                      <form key={action.status} action={updateListingStatusAction}>
                        <input type="hidden" name="id" value={listing.id} />
                        <input type="hidden" name="status" value={action.status} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className={
                            action.status === "removed" ? "text-danger" : undefined
                          }
                        >
                          {t(action.labelKey)}
                        </Button>
                      </form>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
