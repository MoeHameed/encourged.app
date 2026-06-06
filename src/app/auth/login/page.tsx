import Link from "next/link";
import { login } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <AuthForm
        action={login}
        cta="Log in"
        error={error}
        message={message}
        next={next}
      />
      <div className="flex gap-4 text-sm text-muted-foreground">
        <Link
          className="underline"
          href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}
        >
          Sign up
        </Link>
        <Link className="underline" href="/auth/reset">
          Forgot password?
        </Link>
      </div>
    </main>
  );
}
