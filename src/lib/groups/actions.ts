"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description,
  });
  if (error) {
    redirect(`/app/group/new?error=${encodeURIComponent(error.message)}`);
  }
  // Refresh the app layout so the bottom nav now shows the Group link.
  revalidatePath("/app", "layout");
  redirect("/app/group");
}
