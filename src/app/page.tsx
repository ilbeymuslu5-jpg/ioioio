import Link from "next/link";
import {
  ArrowRight,
  Handshake,
  Layers,
  MapPin,
  Megaphone,
  Plus,
  Recycle,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function HomePage() {
  const t = useTranslations("home");

  const entries = [
    {
      href: `${routes.listings}?tip=palet`,
      icon: Layers,
      title: t("entry.palletTitle"),
      description: t("entry.palletDescription"),
      badge: t("entry.palletBadge"),
    },
    {
      href: `${routes.listings}?tip=atik`,
      icon: Recycle,
      title: t("entry.wasteTitle"),
      description: t("entry.wasteDescription"),
      badge: t("entry.wasteBadge"),
    },
  ];

  const steps = [
    {
      icon: Megaphone,
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Description"),
    },
    {
      icon: Handshake,
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Description"),
    },
    {
      icon: Truck,
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Description"),
    },
  ];

  return (
    <>
      <section className="bg-brand-soft">
        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl">
            <Badge>
              <MapPin aria-hidden="true" />
              {t("hero.badge")}
            </Badge>
            <h1 className="text-brand-dark mt-4 text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-ink-muted mt-4 text-base sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={routes.newListing}>
                  <Plus aria-hidden="true" />
                  {t("hero.primaryCta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={routes.listings}>{t("hero.secondaryCta")}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="entry-heading">
        <Container className="py-14">
          <h2 id="entry-heading" className="text-ink text-2xl font-bold">
            {t("entry.heading")}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {entries.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="group border-line shadow-soft hover:border-brand-dark hover:bg-brand-soft flex flex-col gap-4 rounded-xl border bg-white p-6 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-brand-light text-brand-dark flex size-12 items-center justify-center rounded-xl"
                  >
                    <entry.icon className="size-6" />
                  </span>
                  <Badge variant="soft" className="group-hover:bg-white">
                    {entry.badge}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-ink text-xl font-semibold">{entry.title}</h3>
                  <p className="text-ink-muted mt-1 text-sm">{entry.description}</p>
                </div>
                <span className="text-brand-dark mt-auto inline-flex items-center gap-1 text-sm font-semibold">
                  {t("entry.cta")}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="how-heading" className="bg-brand-soft">
        <Container className="py-14">
          <h2 id="how-heading" className="text-ink text-2xl font-bold">
            {t("howItWorks.heading")}
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="border-line rounded-xl border bg-white p-6">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-brand-dark flex size-10 items-center justify-center rounded-lg text-white"
                  >
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-ink-muted text-sm font-semibold tabular-nums">
                    {index + 1} / {steps.length}
                  </span>
                </div>
                <h3 className="text-ink mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="text-ink-muted mt-1 text-sm">{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
