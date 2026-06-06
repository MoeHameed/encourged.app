import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/shell/DashboardHeader";
import { EmptyStateCard } from "@/components/shell/EmptyStateCard";
import { displayNameFallback } from "@/lib/domain/goals";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user!.id)
    .single();

  const name = displayNameFallback(profile?.display_name, profile?.email ?? "");

  return (
    <>
      <DashboardHeader name={name} />
      <div className="space-y-4 p-4">
        <EmptyStateCard message="Nothing here yet. Create your first goal!" />
      </div>
    </>
  );
}
