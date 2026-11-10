"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const statusChangeSchema = z.object({
  id: z.uuid(),
  status: z.enum(["active", "reserved", "completed", "removed"]),
});

/** İlan durumunu değiştirir. Yetki ve geçiş kuralları veritabanında (RLS + tetikleyici) denetlenir. */
export async function updateListingStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const parsed = statusChangeSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("listings")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) console.error("updateListingStatusAction failed:", error.message);

  revalidatePath(routes.panel);
  revalidatePath(routes.listings);
}
