const LOCALE = "tr-TR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** 1250 → "1.250,00 ₺" */
export function formatPrice(amount: number): string {
  const parts = currencyFormatter.formatToParts(amount);
  const value = parts
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return `${value} ₺`;
}

/** 12500.5 → "12.500,5" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
