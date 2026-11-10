"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button>;

export function SubmitButton({ children, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
