import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/common/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.newListing");
  return { title: t("title"), robots: { index: false } };
}

export default function NewListingPage() {
  const t = useTranslations("pages.newListing");
  return <ComingSoon title={t("title")} description={t("description")} />;
}
