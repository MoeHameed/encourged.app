import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  name,
  groupName,
}: {
  name: string;
  groupName?: string | null;
}) {
  return (
    <header className="flex items-center justify-between gap-2 p-4">
      <div>
        <p className="text-lg font-semibold">Hi, {name} 👋</p>
        {groupName && (
          <p className="text-sm text-muted-foreground">{groupName}</p>
        )}
      </div>
      <form action={logout}>
        <Button variant="ghost" size="sm" type="submit">
          Log out
        </Button>
      </form>
    </header>
  );
}
