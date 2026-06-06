import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileBottomNav } from "@/components/shell/MobileBottomNav";

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
      {children}
      <MobileBottomNav inGroup={!!membership} />
    </div>
  );
}
