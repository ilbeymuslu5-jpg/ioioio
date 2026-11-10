import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/schema";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/** E-posta onay bağlantısının döndüğü adres: kodu oturuma çevirir. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const nextPath = safeNextPath(searchParams.get("next"), routes.companySetup);
  const failure = NextResponse.redirect(`${origin}${routes.login}?hata=onay`);

  if (!isSupabaseConfigured) return failure;
  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure : NextResponse.redirect(`${origin}${nextPath}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? failure : NextResponse.redirect(`${origin}${nextPath}`);
  }

  return failure;
}
