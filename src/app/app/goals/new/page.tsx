import { createPersonalGoal } from "@/lib/goals/actions";
import { CreateGoalForm } from "@/components/goals/CreateGoalForm";

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">New personal goal</h1>
      <CreateGoalForm action={createPersonalGoal} error={error} />
    </div>
  );
}
