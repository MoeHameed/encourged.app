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

export async function updateGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: m } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id)
    .single();
  if (m) {
    await supabase
      .from("groups")
      .update({ name, description: description || null })
      .eq("id", m.group_id);
  }
  revalidatePath("/app/group");
  revalidatePath("/app/group/settings");
  redirect("/app/group/settings");
}

async function runMemberRpc(fn: string, userId: string | null) {
  const supabase = await createClient();
  const args = userId ? { p_user_id: userId } : {};
  const { error } = await supabase.rpc(fn, args);
  return error?.message ?? null;
}

export async function promoteMember(formData: FormData) {
  const err = await runMemberRpc(
    "promote_member",
    String(formData.get("user_id")),
  );
  redirect(
    err
      ? `/app/group/settings?error=${encodeURIComponent(err)}`
      : "/app/group/settings",
  );
}

export async function demoteAdmin(formData: FormData) {
  const err = await runMemberRpc(
    "demote_admin",
    String(formData.get("user_id")),
  );
  redirect(
    err
      ? `/app/group/settings?error=${encodeURIComponent(err)}`
      : "/app/group/settings",
  );
}

export async function removeMember(formData: FormData) {
  const err = await runMemberRpc(
    "remove_member",
    String(formData.get("user_id")),
  );
  redirect(
    err
      ? `/app/group/settings?error=${encodeURIComponent(err)}`
      : "/app/group/settings",
  );
}

export async function transferOwnership(formData: FormData) {
  const err = await runMemberRpc(
    "transfer_ownership",
    String(formData.get("user_id")),
  );
  redirect(
    err
      ? `/app/group/settings?error=${encodeURIComponent(err)}`
      : "/app/group/settings",
  );
}

export async function leaveGroup() {
  const err = await runMemberRpc("leave_group", null);
  if (err) redirect(`/app/group/settings?error=${encodeURIComponent(err)}`);
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function deleteGroup() {
  const err = await runMemberRpc("delete_group", null);
  if (err) redirect(`/app/group/settings?error=${encodeURIComponent(err)}`);
  revalidatePath("/app", "layout");
  redirect("/app");
}
