import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-brand-dark text-3xl font-bold">{t("title")}</h1>
      <p className="text-ink-muted max-w-md">{t("description")}</p>
      <Button asChild>
        <Link href={routes.home}>{t("backHome")}</Link>
      </Button>
    </Container>
  );
}
