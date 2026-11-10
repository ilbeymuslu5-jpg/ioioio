import Link from "next/link";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";
import { Container } from "./container";
import { Logo } from "./logo";

export function Footer() {
  const t = useTranslations("footer");

  const columns = [
    {
      title: t("marketplace"),
      links: [
        { href: routes.listings, label: t("listings") },
        { href: routes.newListing, label: t("postListing") },
        { href: routes.howItWorks, label: t("howItWorks") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: routes.about, label: t("about") },
        { href: routes.contact, label: t("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: routes.terms, label: t("terms") },
        { href: routes.kvkk, label: t("kvkk") },
        { href: routes.privacy, label: t("privacy") },
      ],
    },
  ];

  return (
    <footer className="bg-brand-dark text-white">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo tone="inverse" />
          <p className="max-w-xs text-sm text-white/80">{t("tagline")}</p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-white/15">
        <Container className="py-5 text-sm text-white/80">
          {t("copyright", { year: new Date().getFullYear() })}
        </Container>
      </div>
    </footer>
  );
}
