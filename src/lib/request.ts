import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";

/** İsteğin geldiği site adresi (ör. https://ornek.vercel.app). */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return siteUrl;
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
