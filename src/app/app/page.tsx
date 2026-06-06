import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/shell/DashboardHeader";
import { EmptyStateCard } from "@/components/shell/EmptyStateCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { displayNameFallback } from "@/lib/domain/goals";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user!.id)
    .single();

  const name = displayNameFallback(profile?.display_name, profile?.email ?? "");

  // Load membership to decide whether to show "Create a group" link
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  // Load goals via two queries to avoid embedded-type issues
  const { data: assignments } = await supabase
    .from("goal_assignments")
    .select("goal_id,status,is_late")
    .eq("user_id", user!.id);

  const goalIds = (assignments ?? []).map((a) => a.goal_id);
  const goalsById: Record<
    string,
    { id: string; title: string; scope: "personal" | "group"; due_at: string | null }
  > = {};

  if (goalIds.length) {
    const { data: gs } = await supabase
      .from("goals")
      .select("id,title,scope,due_at")
      .in("id", goalIds);
    for (const g of gs ?? []) goalsById[g.id] = g;
  }

  const goals = (assignments ?? [])
    .map((a) => {
      const g = goalsById[a.goal_id];
      return g ? { ...g, assignmentStatus: a.status, isLate: a.is_late } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return (
    <>
      <DashboardHeader name={name} />
      <div className="space-y-4 p-4">
        {/* Action button row */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/goals/new"
            className={buttonVariants({ size: "sm" })}
          >
            New personal goal
          </Link>
          {membership ? (
            <Link
              href="/app/group"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View group
            </Link>
          ) : (
            <Link
              href="/app/group/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Create a group
            </Link>
          )}
        </div>

        {/* My goals section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            My goals
          </h2>
          {goals.length === 0 ? (
            <EmptyStateCard message="Nothing here yet. Create your first goal!" />
          ) : (
            goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          )}
        </section>
      </div>
    </>
  );
}
