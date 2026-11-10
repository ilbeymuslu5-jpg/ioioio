import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { Container } from "./container";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

export async function Header() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();

  const links = [
    { href: routes.listings, label: t("listings") },
    { href: routes.howItWorks, label: t("howItWorks") },
  ];

  const mobileLinks = user
    ? [...links, { href: routes.panel, label: t("panel") }]
    : [
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
            {user ? (
              <Link href={routes.panel}>
                <UserRound aria-hidden="true" />
                {t("panel")}
              </Link>
            ) : (
              <Link href={routes.login}>{t("login")}</Link>
            )}
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
