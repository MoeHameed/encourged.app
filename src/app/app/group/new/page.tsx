import { createGroup } from "@/lib/groups/actions";
import { CreateGroupForm } from "@/components/groups/CreateGroupForm";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Create a group</h1>
      <CreateGroupForm action={createGroup} error={error} />
    </div>
  );
}
