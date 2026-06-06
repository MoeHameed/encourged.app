import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  updateGroup,
  promoteMember,
  demoteAdmin,
  removeMember,
  transferOwnership,
  leaveGroup,
  deleteGroup,
} from "@/lib/groups/actions";
import { ConfirmButton } from "@/components/groups/ConfirmButton";

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

  // Load the group details
  const { data: group } = await supabase
    .from("groups")
    .select("name, description")
    .eq("id", membership.group_id)
    .single();

  // Load all members for this group
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", membership.group_id);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  // Load profiles for all member ids
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.id, p.display_name as string | null]),
  );

  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id as string,
    role: m.role as string,
    display_name: profileMap.get(m.user_id) ?? m.user_id,
  }));

  // Load invites
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
  const isOwner = membership.role === "owner";
  const isAdmin = membership.role === "admin";

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

      {/* Edit group */}
      <Card>
        <CardHeader>
          <CardTitle>Edit group</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateGroup} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                name="name"
                type="text"
                defaultValue={group?.name ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                name="description"
                defaultValue={group?.description ?? ""}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {members.map((member) => {
            const isSelf = member.user_id === user.id;
            return (
              <div
                key={member.user_id}
                className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {member.display_name}
                    {isSelf && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide ml-auto">
                    {member.role}
                  </span>
                </div>

                {/* Owner actions on non-self members */}
                {isOwner && !isSelf && (
                  <div className="flex flex-wrap gap-2">
                    {member.role === "member" && (
                      <>
                        <form action={promoteMember}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.user_id}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Make admin
                          </Button>
                        </form>
                        <form action={removeMember}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.user_id}
                          />
                          <ConfirmButton
                            size="sm"
                            variant="destructive"
                            message="Remove this member?"
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      </>
                    )}
                    {member.role === "admin" && (
                      <>
                        <form action={demoteAdmin}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.user_id}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Make member
                          </Button>
                        </form>
                        <form action={removeMember}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.user_id}
                          />
                          <ConfirmButton
                            size="sm"
                            variant="destructive"
                            message="Remove this member?"
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                        <form action={transferOwnership}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.user_id}
                          />
                          <ConfirmButton
                            size="sm"
                            variant="outline"
                            message="Transfer ownership to this person? You'll become an admin."
                          >
                            Make owner
                          </ConfirmButton>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {/* Admin actions on non-self members with role "member" */}
                {isAdmin && !isSelf && member.role === "member" && (
                  <div className="flex flex-wrap gap-2">
                    <form action={removeMember}>
                      <input
                        type="hidden"
                        name="user_id"
                        value={member.user_id}
                      />
                      <ConfirmButton
                        size="sm"
                        variant="destructive"
                        message="Remove this member?"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Invite by email */}
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

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          {isOwner ? (
            <form action={deleteGroup}>
              <ConfirmButton
                variant="destructive"
                message="Delete this group for everyone? This cannot be undone."
              >
                Delete group
              </ConfirmButton>
            </form>
          ) : (
            <form action={leaveGroup}>
              <ConfirmButton
                variant="outline"
                message="Leave this group?"
              >
                Leave group
              </ConfirmButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
