import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Supabase "Site URL" ayarı ana sayfayı gösteriyorsa onay kodu oraya düşer;
  // kodu oturuma çeviren adrese aktar.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = routes.authCallback;
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
