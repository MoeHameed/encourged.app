import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileBottomNav } from "@/components/shell/MobileBottomNav";
import { NotificationBell } from "@/components/shell/NotificationBell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-20">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-2 backdrop-blur-sm">
        <Link href="/app" className="font-semibold">
          encouraged
        </Link>
        <NotificationBell />
      </header>
      {children}
      <MobileBottomNav inGroup={!!membership} />
    </div>
  );
}
