import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { GoalCompletionButtons } from "@/components/goals/GoalCompletionButtons";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goal } = await supabase
    .from("goals")
    .select("id,title,description,due_at,scope")
    .eq("id", goalId)
    .maybeSingle();

  if (!goal) notFound();

  // For group goals, load all member assignment statuses
  let groupProgress: Array<{ displayName: string; status: string }> | null = null;
  if (goal.scope === "group") {
    const { data: allAssignments } = await supabase
      .from("goal_assignments")
      .select("user_id,status")
      .eq("goal_id", goalId);

    const memberUserIds = (allAssignments ?? []).map((a) => a.user_id);
    const profileNameById: Record<string, string> = {};
    if (memberUserIds.length) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", memberUserIds);
      for (const p of memberProfiles ?? []) profileNameById[p.id] = p.display_name;
    }

    groupProgress = (allAssignments ?? []).map((a) => ({
      displayName: profileNameById[a.user_id] ?? "Member",
      status: a.status,
    }));
  }

  const { data: assignment } = await supabase
    .from("goal_assignments")
    .select("status,last_note,is_late")
    .eq("goal_id", goalId)
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: history } = await supabase
    .from("completion_records")
    .select("action,note,is_late,created_at")
    .eq("goal_id", goalId)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const status = assignment?.status ?? "not_started";
  const isLate = assignment?.is_late ?? false;
  const lastNote = assignment?.last_note ?? null;

  const scopeLabel = goal.scope === "personal" ? "Personal" : "Group goal";
  const dueMeta = goal.due_at
    ? `Due ${new Date(goal.due_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`
    : "No due date";

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link href="/app" className="text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>

      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-xl font-semibold">{goal.title}</h1>
        <GoalStatusBadge status={status} isLate={isLate} />
      </div>

      {goal.description && (
        <p className="text-sm text-muted-foreground">{goal.description}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {scopeLabel} · {dueMeta}
      </p>

      <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
        <p className="text-sm font-medium">Log your progress</p>
        <GoalCompletionButtons goalId={goal.id} withNote />
      </div>

      {lastNote && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Latest note</p>
          <p className="text-sm">{lastNote}</p>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">History</p>
          <ul className="flex flex-col gap-2">
            {history.map((record, i) => (
              <li key={i} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{record.action}</span>
                  {record.is_late && (
                    <span className="text-xs text-muted-foreground">(late)</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {record.note && (
                  <p className="mt-1 text-muted-foreground">{record.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groupProgress && groupProgress.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Group progress</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupProgress.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2">{row.displayName}</td>
                    <td className="px-4 py-2 text-right">
                      <GoalStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
