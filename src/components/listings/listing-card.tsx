import { BadgeCheck, MapPin, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPrice } from "@/lib/format";
import type { ListingSummary } from "@/lib/listings/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

type ListingCardProps = {
  listing: ListingSummary;
  isSample?: boolean;
  className?: string;
};

export function ListingCard({ listing, isSample = false, className }: ListingCardProps) {
  const t = useTranslations("listing");
  const tCategory = useTranslations("categories");
  const unit = t(`units.${listing.unit}`);

  return (
    <article
      className={cn(
        "border-line shadow-soft flex flex-col overflow-hidden rounded-xl border bg-white",
        className,
      )}
    >
      <div className="bg-brand-soft relative flex h-28 items-center justify-center">
        <CategoryIcon
          slug={listing.categorySlug}
          className="text-brand-dark size-10 opacity-70"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant={listing.listingType === "offer" ? "brand" : "outline"}>
            {t(`type.${listing.listingType}`)}
          </Badge>
          {isSample ? <Badge variant="outline">{t("sample")}</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-ink-muted text-xs font-medium">
            {tCategory(listing.categorySlug)}
          </p>
          <h3 className="text-ink mt-0.5 text-base leading-snug font-semibold">
            {listing.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="soft">
            {formatNumber(listing.quantity)} {unit}
          </Badge>
          {listing.frequency !== "once" ? (
            <Badge variant="soft">
              <Repeat aria-hidden="true" />
              {t(`frequency.${listing.frequency}`)}
            </Badge>
          ) : null}
          {listing.ispm15 ? <Badge>{t("ispm15")}</Badge> : null}
        </div>

        <div className="border-line mt-auto flex items-end justify-between gap-3 border-t pt-3">
          <div className="min-w-0">
            <p className="text-ink flex items-center gap-1 truncate text-sm font-medium">
              <span className="truncate">{listing.companyName}</span>
              {listing.isVerified ? (
                <BadgeCheck
                  role="img"
                  aria-label={t("verified")}
                  className="text-brand-dark size-4 shrink-0"
                />
              ) : null}
            </p>
            <p className="text-ink-muted mt-0.5 flex items-center gap-1 text-xs">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {listing.district}, {listing.city}
            </p>
          </div>
          <p className="text-brand-dark shrink-0 text-right text-sm font-bold">
            {listing.priceType === "fixed" && listing.price !== null ? (
              <>
                {formatPrice(listing.price)}
                <span className="text-ink-muted block text-xs font-normal">
                  {t("perUnit", { unit })}
                </span>
              </>
            ) : (
              t(`price.${listing.priceType}`)
            )}
          </p>
        </div>
      </div>
    </article>
  );
}
