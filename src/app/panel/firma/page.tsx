import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { CompanyForm } from "@/components/panel/company-form";
import { safeNextPath } from "@/lib/auth/schema";
import { getCurrentCompany, requireUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type CompanySetupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company");
  return { title: t("title"), robots: { index: false } };
}

export default async function CompanySetupPage({ searchParams }: CompanySetupPageProps) {
  const { next } = await searchParams;
  await requireUser(routes.companySetup);
  const company = await getCurrentCompany();
  const t = await getTranslations("company");

  return (
    <div className="bg-brand-soft flex-1">
      <Container className="max-w-2xl py-10 sm:py-14">
        <div className="border-line shadow-soft rounded-xl border bg-white p-6 sm:p-8">
          <h1 className="text-brand-dark text-2xl font-bold tracking-tight">
            {company ? t("editTitle") : t("title")}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {company ? t("editDescription") : t("setupDescription")}
          </p>
          <div className="mt-6">
            <CompanyForm company={company} nextPath={safeNextPath(next, routes.panel)} />
          </div>
        </div>
      </Container>
    </div>
  );
}
