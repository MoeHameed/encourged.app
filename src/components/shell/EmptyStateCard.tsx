import { Card, CardContent } from "@/components/ui/card";

export function EmptyStateCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
