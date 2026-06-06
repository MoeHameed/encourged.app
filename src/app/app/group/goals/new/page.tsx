import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroupGoal } from "@/lib/group-goals/actions";
import { CreateGoalForm } from "@/components/goals/CreateGoalForm";

export default async function NewGroupGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/app/group");

  const isAdminOrOwner =
    membership.role === "owner" || membership.role === "admin";
  if (!isAdminOrOwner) redirect("/app/group");

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">New group goal</h1>
      <CreateGoalForm action={createGroupGoal} error={error} />
    </div>
  );
}
