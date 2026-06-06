export type CompletionAction = "done" | "partial" | "skipped";
export type AssignmentStatus =
  | "not_started"
  | "completed"
  | "partial"
  | "skipped";

export function displayNameFallback(
  name: string | null | undefined,
  email: string,
): string {
  if (name && name.trim()) return name;
  return email.split("@")[0];
}

export function mapActionToStatus(action: CompletionAction): AssignmentStatus {
  return action === "done" ? "completed" : action;
}

export function isLate(dueAt: Date | null, now: Date): boolean {
  if (!dueAt) return false;
  return now.getTime() > dueAt.getTime();
}

// Returns the UTC instant for 23:59:59.999 of `dateStr` (YYYY-MM-DD) in `tz`.
export function computeDueAtEndOfDay(
  dateStr: string,
  tz: string,
): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use a noon-UTC probe so DST edge cases on midnight don't affect the offset.
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // Use Intl.DateTimeFormat to read the local time components in the target tz
  // (avoids depending on the host machine's own timezone when parsing locale strings).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(probe);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);
  // Reconstruct probe's local time as if it were UTC to find the tz offset.
  const localProbeAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = localProbeAsUtc - probe.getTime();
  const endLocalAsUtc = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return new Date(endLocalAsUtc - offsetMs);
}

export function isGoalCompletedByEveryone(
  memberStatuses: AssignmentStatus[],
): boolean {
  if (memberStatuses.length === 0) return false;
  return memberStatuses.every((s) => s === "completed");
}
