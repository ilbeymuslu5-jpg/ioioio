"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/schema";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { companyFormSchema } from "@/lib/companies/schema";
import { fieldErrorsFromIssues, formValues, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";
import { slugifyWithId } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

const FIELD_NAMES = [
  "name",
  "taxNumber",
  "sector",
  "phone",
  "city",
  "district",
  "description",
  "next",
];

export async function saveCompanyAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, FIELD_NAMES);
  const user = await getCurrentUser();
  if (!user) return { error: "authRequired", values };

  const parsed = companyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromIssues(parsed.error.issues), values };
  }

  const fields = {
    name: parsed.data.name,
    tax_number: parsed.data.taxNumber || null,
    sector: parsed.data.sector || null,
    phone: parsed.data.phone,
    city: parsed.data.city,
    district: parsed.data.district || null,
    description: parsed.data.description || null,
  };

  const supabase = await createClient();
  const existing = await getCurrentCompany();

  const { error } = existing
    ? await supabase.from("companies").update(fields).eq("id", existing.id)
    : await (() => {
        const id = randomUUID();
        return supabase.from("companies").insert({
          ...fields,
          id,
          owner_id: user.id,
          slug: slugifyWithId(fields.name, id),
        });
      })();

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { taxNumber: "taxNumberTaken" }, values };
    }
    console.error("saveCompanyAction failed:", error.message);
    return { error: "generic", values };
  }

  revalidatePath(routes.panel, "layout");
  redirect(safeNextPath(values.next, routes.panel));
}
