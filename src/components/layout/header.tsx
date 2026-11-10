import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { Container } from "./container";
import { Logo } from "./logo";

export function Header() {
  const t = useTranslations("nav");

  const links = [
    { href: routes.listings, label: t("listings") },
    { href: routes.howItWorks, label: t("howItWorks") },
  ];

  return (
    <header className="border-line sticky top-0 z-40 border-b bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t("ariaLabel")} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink hover:bg-brand-soft hover:text-brand-dark rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={routes.login}>{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={routes.newListing}>
              <Plus aria-hidden="true" />
              {t("postListing")}
            </Link>
          </Button>
        </div>
      </Container>

      {/* Mobil: ikincil gezinme satırı */}
      <nav aria-label={t("ariaLabel")} className="border-line border-t md:hidden">
        <Container>
          <ul className="-mx-2 flex items-center gap-1 overflow-x-auto py-1.5">
            {[...links, { href: routes.login, label: t("login") }].map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className="text-ink-muted hover:text-brand-dark block rounded-lg px-2 py-1.5 text-sm font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </header>
  );
}
