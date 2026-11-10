import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeNextPath } from "@/lib/auth/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next, routes.companySetup);
  if (await getCurrentUser()) redirect(nextPath);

  const t = await getTranslations("auth");
  const loginHref = next
    ? `${routes.login}?next=${encodeURIComponent(nextPath)}`
    : routes.login;

  return (
    <AuthShell
      title={t("signUpTitle")}
      description={t("signUpDescription")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link
            href={loginHref}
            className="text-brand-dark font-semibold hover:underline"
          >
            {t("signIn")}
          </Link>
        </>
      }
    >
      <SignUpForm nextPath={nextPath} />
    </AuthShell>
  );
}
