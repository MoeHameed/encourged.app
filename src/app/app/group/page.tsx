import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function GroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/app");

  const { data: group } = await supabase
    .from("groups")
    .select("name, description")
    .eq("id", membership.group_id)
    .single();

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", membership.group_id);

  const ids = (memberRows ?? []).map((m) => m.user_id);
  const nameById: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profs ?? []) nameById[p.id] = p.display_name;
  }

  const isAdminOrOwner =
    membership.role === "owner" || membership.role === "admin";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{group?.name}</h1>
          {group?.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        {isAdminOrOwner && (
          <Link
            href="/app/group/settings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Settings &amp; invites
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(memberRows ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {nameById[m.user_id] ?? "Member"}
              </span>
              <span className="text-xs text-muted-foreground">{m.role}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
