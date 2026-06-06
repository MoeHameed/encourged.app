import { recordCompletion } from "@/lib/goals/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GoalCompletionButtons({
  goalId,
  withNote = false,
}: {
  goalId: string;
  withNote?: boolean;
}) {
  return (
    <form action={recordCompletion} className="flex flex-col gap-2">
      <input type="hidden" name="goal_id" value={goalId} />
      {withNote && (
        <Textarea name="note" placeholder="Add a note (optional)" rows={2} />
      )}
      <div className="flex gap-2">
        <Button type="submit" name="action" value="done" size="sm">
          Done
        </Button>
        <Button type="submit" name="action" value="partial" size="sm" variant="secondary">
          Partial
        </Button>
        <Button type="submit" name="action" value="skipped" size="sm" variant="outline">
          Skipped
        </Button>
      </div>
    </form>
  );
}
