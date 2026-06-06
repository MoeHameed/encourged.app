"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeDueAtEndOfDay } from "@/lib/domain/goals";

export async function createGroupGoal(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let tz = "UTC";
  if (dueDate) {
    const { data: profile } = await supabase
      .from("profiles").select("timezone").eq("id", user.id).single();
    tz = profile?.timezone ?? "UTC";
  }
  const dueAt = computeDueAtEndOfDay(dueDate, tz);

  const { error } = await supabase.rpc("create_group_goal", {
    p_title: title,
    p_description: description,
    p_due_at: dueAt ? dueAt.toISOString() : null,
  });
  if (error) {
    redirect(`/app/group/goals/new?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/app", "layout");
  redirect("/app/group");
}
