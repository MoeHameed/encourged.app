import { requestReset } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <AuthForm
        action={requestReset}
        cta="Send reset link"
        showPassword={false}
        error={error}
      />
    </main>
  );
}
