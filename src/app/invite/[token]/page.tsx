import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { acceptInvite } from "@/lib/invites/actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: previewRows } = await supabase.rpc("get_invite_preview", {
    p_token: token,
  });
  const preview = (previewRows as { group_name: string; valid: boolean; reason: string }[] | null)?.[0];

  if (!preview || !preview.valid) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Invite invalid</h1>
          <p className="text-sm text-muted-foreground">
            This invite is {preview?.reason ?? "invalid"}.
          </p>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">
            You&apos;re invited to join{" "}
            <span className="font-bold">{preview.group_name}</span>
          </h1>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={buttonVariants()}>
              Join {preview.group_name}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">
          Join <span className="font-bold">{preview.group_name}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to accept this invite.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href={`/auth/login?next=/invite/${token}`}
            className={buttonVariants()}
          >
            Log in to join
          </Link>
          <Link
            href="/auth/sign-up"
            className={buttonVariants({ variant: "outline" })}
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
