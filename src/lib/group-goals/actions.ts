"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeDueAtEndOfDay } from "@/lib/domain/goals";
import { sendEmail } from "@/lib/email/send";

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

  const { data: membership } = await supabase
    .from("group_members").select("group_id").eq("user_id", user!.id).single();
  if (membership) {
    const { data: memberRows } = await supabase
      .from("group_members").select("user_id").eq("group_id", membership.group_id);
    const otherIds = (memberRows ?? []).map((m) => m.user_id).filter((id) => id !== user!.id);
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("email,email_on_new_goal").in("id", otherIds);
      const recipients = (profs ?? []).filter((p) => p.email_on_new_goal).map((p) => p.email);
      if (recipients.length) {
        const safeTitle = title
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        await sendEmail({
          to: recipients,
          subject: `New goal in encouraged.app: ${title}`,
          html: `<p>Your group has a new goal: <strong>${safeTitle}</strong>.</p><p>Open encouraged.app to log your progress.</p>`,
        });
      }
    }
  }

  revalidatePath("/app", "layout");
  redirect("/app/group");
}
