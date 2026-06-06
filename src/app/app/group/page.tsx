import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoalProgressSummary } from "@/components/goals/GoalProgressSummary";
import { ActivityFeed } from "@/components/shell/ActivityFeed";

export default async function GroupPage() {
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

  if (!membership) redirect("/app");

  const { data: group } = await supabase
    .from("groups")
    .select("name, description")
    .eq("id", membership.group_id)
    .single();

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", membership.group_id);

  const ids = (memberRows ?? []).map((m) => m.user_id);
  const nameById: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profs ?? []) nameById[p.id] = p.display_name;
  }

  const isAdminOrOwner =
    membership.role === "owner" || membership.role === "admin";

  // Load group goals
  const { data: groupGoals } = await supabase
    .from("goals")
    .select("id,title,due_at,status")
    .eq("group_id", membership.group_id)
    .eq("scope", "group")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const goalIds = (groupGoals ?? []).map((g) => g.id);

  // Tally completion counts per goal
  const countByGoal: Record<string, { total: number; done: number }> = {};
  if (goalIds.length) {
    const { data: assignmentRows } = await supabase
      .from("goal_assignments")
      .select("goal_id,status")
      .in("goal_id", goalIds);
    for (const row of assignmentRows ?? []) {
      if (!countByGoal[row.goal_id]) countByGoal[row.goal_id] = { total: 0, done: 0 };
      countByGoal[row.goal_id].total += 1;
      if (row.status === "completed") countByGoal[row.goal_id].done += 1;
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{group?.name}</h1>
          {group?.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        {isAdminOrOwner && (
          <Link
            href="/app/group/settings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Settings &amp; invites
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(memberRows ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {nameById[m.user_id] ?? "Member"}
              </span>
              <span className="text-xs text-muted-foreground">{m.role}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Group goals
          </h2>
          {isAdminOrOwner && (
            <Link
              href="/app/group/goals/new"
              className={buttonVariants({ size: "sm" })}
            >
              New group goal
            </Link>
          )}
        </div>

        {(groupGoals ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No group goals yet.</p>
        ) : (
          (groupGoals ?? []).map((goal) => {
            const counts = countByGoal[goal.id] ?? { total: 0, done: 0 };
            return (
              <Card key={goal.id}>
                <CardContent className="pt-4 flex flex-col gap-1">
                  <Link
                    href={`/app/goals/${goal.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {goal.title}
                  </Link>
                  <div className="flex items-center gap-2 flex-wrap">
                    <GoalProgressSummary done={counts.done} total={counts.total} />
                    {goal.due_at && (
                      <span className="text-sm text-muted-foreground">
                        &middot; Due{" "}
                        {new Date(goal.due_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <ActivityFeed groupId={membership.group_id} />
    </div>
  );
}
