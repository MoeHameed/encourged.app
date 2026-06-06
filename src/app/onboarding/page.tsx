import { saveProfile } from "./actions";
import { TimezoneField } from "@/components/onboarding/TimezoneField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Welcome 👋</h1>
      <p className="text-muted-foreground">Tell us your name to get started.</p>
      <form action={saveProfile} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input id="display_name" name="display_name" required />
        </div>
        <TimezoneField />
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </main>
  );
}
