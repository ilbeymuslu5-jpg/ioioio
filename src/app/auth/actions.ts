"use server";

import { redirect } from "next/navigation";
import { safeNextPath, signInSchema, signUpSchema } from "@/lib/auth/schema";
import { isSupabaseConfigured } from "@/lib/env";
import { fieldErrorsFromIssues, formValues, type FormState } from "@/lib/form-state";
import { getRequestOrigin } from "@/lib/request";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

function mapAuthError(message: string, code: string | undefined): string {
  const text = `${code ?? ""} ${message}`.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid_credentials")) {
    return "invalidCredentials";
  }
  if (text.includes("not confirmed") || text.includes("email_not_confirmed")) {
    return "emailNotConfirmed";
  }
  if (text.includes("already registered") || text.includes("user_already_exists")) {
    return "emailTaken";
  }
  if (text.includes("rate limit") || text.includes("over_email_send_rate_limit")) {
    return "rateLimited";
  }
  if (text.includes("weak") || text.includes("password should")) return "passwordMin";
  return "generic";
}

export async function signInAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ["email", "next"]);
  if (!isSupabaseConfigured) return { error: "notConfigured", values };

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromIssues(parsed.error.issues), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapAuthError(error.message, error.code), values };

  redirect(safeNextPath(values.next, routes.panel));
}

export async function signUpAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ["fullName", "email", "next"]);
  if (!isSupabaseConfigured) return { error: "notConfigured", values };

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromIssues(parsed.error.issues), values };
  }

  const nextPath = safeNextPath(values.next, routes.companySetup);
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}${routes.authCallback}?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) return { error: mapAuthError(error.message, error.code), values };

  // E-posta onayı kapalıysa oturum hemen açılır.
  if (data.session) redirect(nextPath);

  // Supabase, kayıtlı e-posta için hata vermek yerine kimliksiz kullanıcı döndürür.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "emailTaken", values };
  }

  return { notice: "checkEmail", values: { email: parsed.data.email } };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(routes.home);
}
