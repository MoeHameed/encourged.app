import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  action,
  cta,
  showEmail = true,
  showPassword = true,
  error,
  message,
}: {
  action: (formData: FormData) => void;
  cta: string;
  showEmail?: boolean;
  showPassword?: boolean;
  error?: string;
  message?: string;
}) {
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      {showEmail && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      )}
      {showPassword && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
          />
        </div>
      )}
      <Button type="submit" className="w-full">
        {cta}
      </Button>
    </form>
  );
}
