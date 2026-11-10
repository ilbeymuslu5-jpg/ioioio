import type { Metadata } from "next";
import { Handshake, Megaphone, ShieldAlert, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("howItWorksPage");
  return { title: t("title"), description: t("intro") };
}

export default function HowItWorksPage() {
  const t = useTranslations("howItWorksPage");
  const home = useTranslations("home.howItWorks");

  const steps = [
    { icon: Megaphone, title: home("step1Title"), description: home("step1Description") },
    { icon: Handshake, title: home("step2Title"), description: home("step2Description") },
    { icon: Truck, title: home("step3Title"), description: home("step3Description") },
  ];

  const listingTypes = [
    { title: t("offerTitle"), description: t("offerDescription") },
    { title: t("requestTitle"), description: t("requestDescription") },
  ];

  const priceTypes = [
    { title: t("priceFixed"), description: t("priceFixedDescription") },
    { title: t("priceNegotiable"), description: t("priceNegotiableDescription") },
    { title: t("priceFree"), description: t("priceFreeDescription") },
  ];

  return (
    <>
      <section className="bg-brand-soft">
        <Container className="py-12 sm:py-16">
          <h1 className="text-brand-dark text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-ink-muted mt-4 max-w-2xl text-base sm:text-lg">
            {t("intro")}
          </p>
        </Container>
      </section>

      <section aria-labelledby="steps-heading">
        <Container className="py-12">
          <h2 id="steps-heading" className="text-ink text-2xl font-bold">
            {t("stepsHeading")}
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

      <section aria-labelledby="types-heading" className="bg-brand-soft">
        <Container className="py-12">
          <h2 id="types-heading" className="text-ink text-2xl font-bold">
            {t("listingTypesHeading")}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {listingTypes.map((type) => (
              <div
                key={type.title}
                className="border-line rounded-xl border bg-white p-6"
              >
                <Badge>{type.title}</Badge>
                <p className="text-ink mt-3 text-sm">{type.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="price-heading">
        <Container className="py-12">
          <h2 id="price-heading" className="text-ink text-2xl font-bold">
            {t("priceHeading")}
          </h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-3">
            {priceTypes.map((price) => (
              <div
                key={price.title}
                className="border-line rounded-xl border bg-white p-6"
              >
                <dt className="text-ink text-lg font-semibold">{price.title}</dt>
                <dd className="text-ink-muted mt-1 text-sm">{price.description}</dd>
              </div>
            ))}
          </dl>

          <div className="border-line mt-10 flex gap-4 rounded-xl border p-6">
            <ShieldAlert
              aria-hidden="true"
              className="text-warning mt-0.5 size-6 shrink-0"
            />
            <div>
              <h2 className="text-ink text-lg font-semibold">{t("hazardHeading")}</h2>
              <p className="text-ink-muted mt-1 text-sm">{t("hazardDescription")}</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
