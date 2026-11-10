import Link from "next/link";
import { Recycle } from "lucide-react";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type LogoProps = {
  tone?: "default" | "inverse";
  className?: string;
};

export function Logo({ tone = "default", className }: LogoProps) {
  const t = useTranslations();
  const inverse = tone === "inverse";

  return (
    <Link
      href={routes.home}
      aria-label={t("nav.homeAriaLabel")}
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight",
        inverse ? "text-white" : "text-brand-dark",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverse ? "text-brand-dark bg-white" : "bg-brand-dark text-white",
        )}
      >
        <Recycle className="size-5" />
      </span>
      {t("common.appName")}
    </Link>
  );
}
