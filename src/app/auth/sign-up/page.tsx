import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <AuthForm action={signUp} cta="Sign up" error={error} />
      <p className="text-sm text-muted-foreground">
        Have an account?{" "}
        <Link className="underline" href="/auth/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
