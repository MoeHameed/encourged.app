import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Guard against open redirects: only allow same-origin relative paths.
  const rawNext = searchParams.get("next") ?? "/app";
  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  const next =
    type === "recovery"
      ? "/auth/update-password"
      : type === "signup" || type === "email"
        ? "/onboarding"
        : safeNext;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(
    new URL("/auth/login?error=Invalid or expired link", request.url),
  );
}
