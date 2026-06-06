import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createEmailInvite,
  createInviteLink,
  revokeInvite,
} from "@/lib/invites/actions";

export default async function GroupSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/app/group");
  }

  const { data: inviteRows } = await supabase
    .from("group_invites")
    .select("id, type, token, invited_email, expires_at, uses, max_uses, revoked_at")
    .eq("group_id", membership.group_id)
    .order("created_at", { ascending: false });

  const now = new Date();
  const activeInvites = (inviteRows ?? []).filter((inv) => {
    if (inv.revoked_at) return false;
    if (inv.expires_at && new Date(inv.expires_at) <= now) return false;
    if (inv.max_uses !== null && inv.uses !== null && inv.uses >= inv.max_uses)
      return false;
    return true;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/app/group"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Group settings</h1>
      </div>

      {error && (
        <p className="text-sm text-red-600 px-1">{decodeURIComponent(error)}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invite by email</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEmailInvite} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="friend@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite link</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createInviteLink}>
            <Button type="submit" variant="outline">
              Create invite link
            </Button>
          </form>
        </CardContent>
      </Card>

      {activeInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active invites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {activeInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {inv.type === "email" ? "Email invite" : "Link invite"}
                  </span>
                  {inv.invited_email && (
                    <span className="text-sm font-medium">{inv.invited_email}</span>
                  )}
                  <input
                    readOnly
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-muted-foreground select-all"
                    value={`${appUrl}/invite/${inv.token}`}
                    aria-label="Invite link"
                  />
                </div>
                <form action={revokeInvite}>
                  <input type="hidden" name="invite_id" value={inv.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Revoke
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
