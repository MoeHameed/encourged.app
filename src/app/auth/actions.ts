"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  if (data.session) {
    redirect("/onboarding");
  }
  redirect("/auth/login?message=Check your email to confirm your account");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const next = String(formData.get("next") ?? "");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/auth/login?error=${encodeURIComponent(error.message)}${next ? "&next=" + encodeURIComponent(next) : ""}`,
    );
  }
  revalidatePath("/", "layout");
  redirect(safeNext);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function requestReset(formData: FormData) {
  const email = String(formData.get("email"));
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
  });
  redirect("/auth/login?message=If that email exists, a reset link is on its way");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/app");
}
