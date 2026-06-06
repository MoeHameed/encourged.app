"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEmailInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group_invite", {
    p_type: "email",
    p_email: email,
  });
  if (error) {
    redirect(`/app/group/settings?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/app/group/settings");
  redirect("/app/group/settings");
}

export async function createInviteLink() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group_invite", {
    p_type: "link",
    p_email: null,
  });
  if (error) {
    redirect(`/app/group/settings?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/app/group/settings");
  redirect("/app/group/settings");
}

export async function revokeInvite(formData: FormData) {
  const id = String(formData.get("invite_id"));
  const supabase = await createClient();
  await supabase
    .from("group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/group/settings");
  redirect("/app/group/settings");
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/app", "layout");
  redirect("/app/group");
}
