import { createClient } from "@/lib/supabase/server";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export async function ActivityFeed({ groupId }: { groupId: string }) {
  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("group_activity")
    .select("summary,created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(20);

  const items = activity ?? [];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent activity
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <span>{item.summary}</span>
              <time
                dateTime={item.created_at}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatRelativeTime(item.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
