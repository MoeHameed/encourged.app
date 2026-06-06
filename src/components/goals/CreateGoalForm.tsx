import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateGoalForm({
  action,
  error,
}: {
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          type="text"
          placeholder="Run 5km"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="due_date">Due date (optional)</Label>
        <Input id="due_date" name="due_date" type="date" />
      </div>
      <Button type="submit" className="w-full">
        Create goal
      </Button>
    </form>
  );
}
