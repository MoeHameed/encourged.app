export function GoalProgressSummary({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  return (
    <span className="text-sm text-muted-foreground">
      {done} of {total} completed
    </span>
  );
}
