import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/common/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.login");
  return { title: t("title"), robots: { index: false } };
}

export default function LoginPage() {
  const t = useTranslations("pages.login");
  return <ComingSoon title={t("title")} description={t("description")} />;
}
