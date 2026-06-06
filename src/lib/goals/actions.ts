"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeDueAtEndOfDay } from "@/lib/domain/goals";

export async function createPersonalGoal(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const dueDate = String(formData.get("due_date") ?? ""); // "YYYY-MM-DD" or ""

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let tz = "UTC";
  if (dueDate) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    tz = profile?.timezone ?? "UTC";
  }
  const dueAt = computeDueAtEndOfDay(dueDate, tz);

  const { error } = await supabase.rpc("create_personal_goal", {
    p_title: title,
    p_description: description,
    p_due_at: dueAt ? dueAt.toISOString() : null,
  });
  if (error) {
    redirect(`/app/goals/new?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/app");
  redirect("/app");
}

export async function recordCompletion(formData: FormData) {
  const goalId = String(formData.get("goal_id"));
  const action = String(formData.get("action"));
  const note = String(formData.get("note") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_completion", {
    p_goal_id: goalId,
    p_action: action,
    p_note: note,
  });
  if (error) {
    console.error("record_completion:", error.message);
  }
  revalidatePath("/app");
  revalidatePath(`/app/goals/${goalId}`);
}
