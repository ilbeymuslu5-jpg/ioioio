import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Factory,
  Handshake,
  Layers,
  MapPin,
  Megaphone,
  PiggyBank,
  Plus,
  Recycle,
  Repeat,
  Truck,
  Warehouse,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { HeroPreview } from "@/components/home/hero-preview";
import { Container } from "@/components/layout/container";
import { CategoryIcon } from "@/components/listings/category-icon";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchForm } from "@/components/listings/search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rootCategories } from "@/lib/categories";
import { sampleListings } from "@/lib/listings/sample";
import { routes } from "@/lib/routes";

export default function HomePage() {
  const t = useTranslations("home");
  const tCategory = useTranslations("categories");

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

  const benefits = [
    {
      icon: PiggyBank,
      title: t("benefits.costTitle"),
      description: t("benefits.costDescription"),
    },
    {
      icon: MapPin,
      title: t("benefits.nearTitle"),
      description: t("benefits.nearDescription"),
    },
    {
      icon: Repeat,
      title: t("benefits.regularTitle"),
      description: t("benefits.regularDescription"),
    },
    {
      icon: BadgeCheck,
      title: t("benefits.verifiedTitle"),
      description: t("benefits.verifiedDescription"),
    },
  ];

  const audiences = [
    {
      icon: Factory,
      title: t("audience.sellerTitle"),
      description: t("audience.sellerDescription"),
    },
    {
      icon: Warehouse,
      title: t("audience.buyerTitle"),
      description: t("audience.buyerDescription"),
    },
    {
      icon: Layers,
      title: t("audience.palletTitle"),
      description: t("audience.palletDescription"),
    },
  ];

  return (
    <>
      <section className="bg-brand-soft overflow-hidden">
        <Container className="grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.25fr_1fr] lg:py-20">
          <div>
            <Badge>
              <MapPin aria-hidden="true" />
              {t("hero.badge")}
            </Badge>
            <h1 className="text-brand-dark mt-4 text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-ink-muted mt-4 max-w-xl text-base sm:text-lg">
              {t("hero.subtitle")}
            </p>

            <SearchForm id="home-search" className="mt-8 max-w-xl" />

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
              <span className="text-ink-muted text-sm">{t("hero.popular")}</span>
              {(["palet", "plastik", "ahsap", "organik"] as const).map((slug) => (
                <Link
                  key={slug}
                  href={`${routes.listings}?kategori=${slug}`}
                  className="border-line text-brand-dark hover:border-brand-dark rounded-full border bg-white px-3 py-1 text-sm font-medium"
                >
                  {tCategory(slug)}
                </Link>
              ))}
            </div>

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

          <HeroPreview />
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
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>

          <h3 className="text-ink mt-10 text-lg font-semibold">
            {t("categories.heading")}
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rootCategories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`${routes.listings}?kategori=${category.slug}`}
                  className="border-line hover:border-brand-dark hover:bg-brand-soft flex items-center gap-3 rounded-xl border bg-white p-3 transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className="bg-brand-soft text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-lg"
                  >
                    <CategoryIcon slug={category.slug} className="size-5" />
                  </span>
                  <span className="text-ink min-w-0 text-sm font-medium">
                    {tCategory(category.slug)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="samples-heading" className="bg-brand-soft">
        <Container className="py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="samples-heading" className="text-ink text-2xl font-bold">
                {t("samples.heading")}
              </h2>
              <p className="text-ink-muted mt-1 max-w-xl text-sm">
                {t("samples.description")}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={routes.listings}>
                {t("samples.cta")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sampleListings.slice(0, 4).map((listing) => (
              <li key={listing.id} className="flex">
                <ListingCard listing={listing} isSample className="w-full" />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="how-heading">
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
          <Link
            href={routes.howItWorks}
            className="text-brand-dark mt-6 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
          >
            {t("howItWorks.more")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Container>
      </section>

      <section aria-labelledby="benefits-heading" className="border-line border-t">
        <Container className="grid gap-10 py-14 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 id="benefits-heading" className="text-ink text-2xl font-bold">
              {t("benefits.heading")}
            </h2>
            <p className="text-ink-muted mt-2 text-sm">{t("benefits.description")}</p>
          </div>
          <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="bg-brand-light text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-lg"
                >
                  <benefit.icon className="size-5" />
                </span>
                <div>
                  <dt className="text-ink font-semibold">{benefit.title}</dt>
                  <dd className="text-ink-muted mt-1 text-sm">{benefit.description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section aria-labelledby="audience-heading" className="bg-brand-soft">
        <Container className="py-14">
          <h2 id="audience-heading" className="text-ink text-2xl font-bold">
            {t("audience.heading")}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {audiences.map((audience) => (
              <li
                key={audience.title}
                className="border-line rounded-xl border bg-white p-6"
              >
                <audience.icon aria-hidden="true" className="text-brand-dark size-7" />
                <h3 className="text-ink mt-3 text-lg font-semibold">{audience.title}</h3>
                <p className="text-ink-muted mt-1 text-sm">{audience.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="cta-heading">
        <Container className="py-14">
          <div className="bg-brand-dark flex flex-col items-start gap-6 rounded-2xl p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="cta-heading" className="text-2xl font-bold text-white">
                {t("cta.heading")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/85">
                {t("cta.description")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" variant="inverse">
                <Link href={routes.newListing}>
                  <Plus aria-hidden="true" />
                  {t("cta.primary")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border border-white/40 text-white hover:bg-white/10 active:bg-white/10"
              >
                <Link href={routes.register}>{t("cta.secondary")}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
