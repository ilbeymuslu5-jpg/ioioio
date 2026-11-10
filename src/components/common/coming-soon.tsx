import Link from "next/link";
import { Hammer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type ComingSoonProps = {
  title: string;
  description: string;
};

/** Henüz yazılmamış sayfalar için geçici içerik. Sayfa hazır olunca kaldırılır. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  const t = useTranslations("comingSoon");

  return (
    <Container className="flex flex-col items-start gap-4 py-16 sm:py-24">
      <Badge>
        <Hammer aria-hidden="true" />
        {t("badge")}
      </Badge>
      <h1 className="text-brand-dark text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="text-ink-muted max-w-xl text-base sm:text-lg">{description}</p>
      <p className="text-ink-muted max-w-xl text-sm">{t("note")}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={routes.home}>{t("backHome")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={routes.howItWorks}>{t("howItWorks")}</Link>
        </Button>
      </div>
    </Container>
  );
}
