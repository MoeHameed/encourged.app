import { updatePassword } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <AuthForm
        action={updatePassword}
        cta="Update password"
        showEmail={false}
        error={error}
      />
    </main>
  );
}
