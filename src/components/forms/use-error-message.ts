"use client";

import { useTranslations } from "next-intl";
import type messages from "../../../messages/tr.json";

type ErrorKey = keyof (typeof messages)["errors"];

/** Şema/sunucu hata anahtarını (messages → errors) Türkçe metne çevirir. */
export function useErrorMessage(): (key: string | undefined) => string | undefined {
  const t = useTranslations("errors");
  return (key) => {
    if (!key) return undefined;
    return t.has(key as ErrorKey) ? t(key as ErrorKey) : t("generic");
  };
}
