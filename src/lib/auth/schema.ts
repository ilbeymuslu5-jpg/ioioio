import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "fullNameMin").max(120, "tooLong"),
  email: z.email("emailInvalid"),
  password: z.string().min(8, "passwordMin").max(72, "tooLong"),
});

/** Yalnızca site içi yollara yönlendirmeye izin verir (açık yönlendirme önlemi). */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  return value;
}
