/** "0532 123 45 67" → "905321234567" (wa.me ve tel: bağlantıları için). Tanınmazsa null. */
export function toInternationalPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return null;
}
