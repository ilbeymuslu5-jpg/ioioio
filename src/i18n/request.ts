import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

// Şimdilik tek dil (tr) ve URL'de dil öneki yok. İngilizce eklenince
// burada locale çözümlemesi (çerez / [locale] segmenti) yapılacak.
export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Istanbul",
  };
});
