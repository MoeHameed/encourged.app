import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "@/lib/notifications/actions";
import { EmptyStateCard } from "@/components/shell/EmptyStateCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,title,body,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = notifications ?? [];
  const hasUnread = items.some((n) => n.read_at === null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <Button variant="outline" size="sm" type="submit">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyStateCard message="No notifications yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((notification) => (
            <li key={notification.id}>
              <Card
                className={
                  notification.read_at === null
                    ? "border-l-4 border-l-primary bg-primary/5"
                    : undefined
                }
              >
                <CardContent className="py-3 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">
                      {notification.title}
                    </p>
                    <time
                      dateTime={notification.created_at}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(notification.created_at)}
                    </time>
                  </div>
                  {notification.body && (
                    <p className="text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
