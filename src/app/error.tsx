"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-brand-dark text-3xl font-bold">{t("title")}</h1>
      <p className="text-ink-muted max-w-md">{t("description")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </Container>
  );
}
