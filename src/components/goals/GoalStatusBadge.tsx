import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  not_started: { label: "To do", variant: "secondary" },
  completed: { label: "Done", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  skipped: { label: "Skipped", variant: "outline" },
};

export function GoalStatusBadge({
  status,
  isLate = false,
}: {
  status: string;
  isLate?: boolean;
}) {
  const mapping = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  const label =
    isLate && status === "completed" ? "Done late" : mapping.label;

  return <Badge variant={mapping.variant}>{label}</Badge>;
}
