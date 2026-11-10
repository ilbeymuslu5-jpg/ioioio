import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/common/coming-soon";
import { Container } from "@/components/layout/container";
import { ListingForm } from "@/components/listings/listing-form";
import { requireCompany } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { fetchCategories } from "@/lib/listings/queries";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listingForm");
  return { title: t("title"), robots: { index: false } };
}

export default async function NewListingPage() {
  const t = await getTranslations("listingForm");

  if (!isSupabaseConfigured) {
    const tErrors = await getTranslations("errors");
    return <ComingSoon title={t("title")} description={tErrors("notConfigured")} />;
  }

  const { company } = await requireCompany(routes.newListing);
  const supabase = await createClient();
  const categories = await fetchCategories(supabase);

  return (
    <Container className="max-w-2xl py-8 sm:py-12">
      <h1 className="text-brand-dark text-2xl font-bold tracking-tight sm:text-3xl">
        {t("title")}
      </h1>
      <p className="text-ink-muted mt-1 text-sm">{t("description")}</p>
      <div className="mt-6">
        <ListingForm
          categories={categories}
          companyId={company.id}
          defaultCity={company.city}
          defaultDistrict={company.district ?? ""}
        />
      </div>
    </Container>
  );
}
