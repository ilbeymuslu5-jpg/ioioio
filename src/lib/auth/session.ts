import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import type { Company } from "@/lib/companies/schema";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const companyRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  slug: z.string(),
  name: z.string(),
  tax_number: z.string().nullable(),
  sector: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string(),
  district: z.string().nullable(),
  description: z.string().nullable(),
  is_verified: z.boolean(),
});

export const COMPANY_COLUMNS =
  "id, owner_id, slug, name, tax_number, sector, phone, city, district, description, is_verified";

export function toCompany(row: unknown): Company {
  const parsed = companyRowSchema.parse(row);
  return {
    id: parsed.id,
    ownerId: parsed.owner_id,
    slug: parsed.slug,
    name: parsed.name,
    taxNumber: parsed.tax_number,
    sector: parsed.sector,
    phone: parsed.phone,
    city: parsed.city,
    district: parsed.district,
    description: parsed.description,
    isVerified: parsed.is_verified,
  };
}

/** Oturumdaki kullanıcı; yoksa null. İstek başına bir kez sorgulanır. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Kullanıcının firması; yoksa null. */
export const getCurrentCompany = cache(async (): Promise<Company | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? toCompany(data) : null;
});

function loginUrl(nextPath: string): string {
  return `${routes.login}?next=${encodeURIComponent(nextPath)}`;
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(nextPath));
  return user;
}

/** Giriş yapmış ve firma bilgisini tamamlamış kullanıcı gerektirir. */
export async function requireCompany(
  nextPath: string,
): Promise<{ user: User; company: Company }> {
  const user = await requireUser(nextPath);
  const company = await getCurrentCompany();
  if (!company) redirect(`${routes.companySetup}?next=${encodeURIComponent(nextPath)}`);
  return { user, company };
}
