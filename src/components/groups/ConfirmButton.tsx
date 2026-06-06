"use client";

import { Button } from "@/components/ui/button";

export function ConfirmButton({
  message,
  children,
  ...props
}: { message: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
