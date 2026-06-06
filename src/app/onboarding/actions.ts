"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const displayName = String(formData.get("display_name")).trim();
  const timezone = String(formData.get("timezone")) || "UTC";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("profiles")
    .update({ display_name: displayName, timezone })
    .eq("id", user.id);

  redirect("/app");
}
