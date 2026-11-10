import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { Container } from "./container";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

export function Header() {
  const t = useTranslations("nav");

  const links = [
    { href: routes.listings, label: t("listings") },
    { href: routes.howItWorks, label: t("howItWorks") },
  ];

  const mobileLinks = [
    ...links,
    { href: routes.login, label: t("login") },
    { href: routes.register, label: t("register") },
  ];

  return (
    <header className="border-line sticky top-0 z-40 border-b bg-white">
      <Container className="relative flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t("ariaLabel")} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <NavLink href={link.href}>{link.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href={routes.login}>{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={routes.newListing}>
              <Plus aria-hidden="true" />
              {t("postListing")}
            </Link>
          </Button>
          <MobileMenu
            links={mobileLinks}
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            navLabel={t("mobileAriaLabel")}
          />
        </div>
      </Container>
    </header>
  );
}
