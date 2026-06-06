import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { GoalCompletionButtons } from "@/components/goals/GoalCompletionButtons";

type GoalCardProps = {
  goal: {
    id: string;
    title: string;
    scope: "personal" | "group";
    due_at: string | null;
    assignmentStatus: string;
    isLate: boolean;
  };
};

export function GoalCard({ goal }: GoalCardProps) {
  const scopeLabel = goal.scope === "personal" ? "Personal" : "Group goal";
  const dueMeta = goal.due_at
    ? `· Due ${new Date(goal.due_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`
    : "· No due date";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/app/goals/${goal.id}`}
            className="font-medium hover:underline"
          >
            {goal.title}
          </Link>
          <GoalStatusBadge status={goal.assignmentStatus} isLate={goal.isLate} />
        </div>
        <p className="text-xs text-muted-foreground">
          {scopeLabel} {dueMeta}
        </p>
        <GoalCompletionButtons goalId={goal.id} />
      </CardContent>
    </Card>
  );
}
