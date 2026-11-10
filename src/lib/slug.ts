const TURKISH_CHAR_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ğ: "g",
  Ğ: "g",
  ş: "s",
  Ş: "s",
  ç: "c",
  Ç: "c",
  ö: "o",
  Ö: "o",
  ü: "u",
  Ü: "u",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
};

/** "İzmir 500 Adet Euro Palet (B Sınıfı)" → "izmir-500-adet-euro-palet-b-sinifi" */
export function slugify(input: string): string {
  return input
    .replace(/[ıİğĞşŞçÇöÖüÜâÂîÎûÛ]/g, (char) => TURKISH_CHAR_MAP[char] ?? char)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Benzersizlik için sona kısa bir kimlik ekler: "...-b-sinifi-abc123" */
export function slugifyWithId(input: string, id: string, maxLength = 80): string {
  const base = slugify(input).slice(0, maxLength).replace(/-+$/g, "");
  const suffix = id.replace(/-/g, "").slice(0, 6).toLowerCase();
  return base ? `${base}-${suffix}` : suffix;
}
