import { BadgeCheck, Handshake, MapPin, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/listings/category-icon";

/** Hero'daki süs amaçlı ürün önizlemesi. Gerçek veri değildir; ekran okuyuculardan gizlenir. */
export function HeroPreview() {
  const t = useTranslations("home.preview");

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-sm select-none lg:mx-0"
    >
      <div className="bg-brand-light absolute -top-6 -right-6 size-40 rounded-full opacity-50 blur-2xl" />

      <div className="border-line relative rounded-2xl border bg-white p-4 shadow-lg shadow-black/5">
        <div className="bg-brand-soft flex h-28 items-center justify-center rounded-xl">
          <CategoryIcon slug="palet" className="text-brand-dark size-12 opacity-70" />
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <Badge>{t("offer")}</Badge>
          <Badge>{t("ispm15")}</Badge>
        </div>
        <p className="text-ink mt-2 font-semibold">{t("palletTitle")}</p>
        <p className="text-ink-muted mt-1 flex items-center gap-1 text-xs">
          <MapPin className="size-3.5" />
          {t("palletLocation")}
          <BadgeCheck className="text-brand-dark ml-1 size-3.5" />
        </p>
      </div>

      <div className="border-line relative -mt-4 ml-auto w-[85%] rounded-2xl border bg-white p-4 shadow-lg shadow-black/5 sm:-mr-6">
        <div className="flex items-start gap-3">
          <span className="bg-brand-light text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-lg">
            <CategoryIcon slug="plastik" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold">{t("wasteTitle")}</p>
            <p className="text-ink-muted mt-0.5 flex items-center gap-1 text-xs">
              <Repeat className="size-3.5" />
              {t("wasteMeta")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-brand-dark relative -mt-3 ml-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10">
        <Handshake className="size-4" />
        {t("newOffer")}
      </div>
    </div>
  );
}
