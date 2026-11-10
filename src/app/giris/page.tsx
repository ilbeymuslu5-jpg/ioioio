import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNextPath } from "@/lib/auth/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; hata?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, hata } = await searchParams;
  const nextPath = safeNextPath(next, routes.panel);
  if (await getCurrentUser()) redirect(nextPath);

  const t = await getTranslations("auth");
  const registerHref = next
    ? `${routes.register}?next=${encodeURIComponent(nextPath)}`
    : routes.register;

  return (
    <AuthShell
      title={t("signInTitle")}
      description={t("signInDescription")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href={registerHref}
            className="text-brand-dark font-semibold hover:underline"
          >
            {t("signUp")}
          </Link>
        </>
      }
    >
      <SignInForm
        nextPath={nextPath}
        initialError={hata === "onay" ? "confirmFailed" : undefined}
      />
    </AuthShell>
  );
}
