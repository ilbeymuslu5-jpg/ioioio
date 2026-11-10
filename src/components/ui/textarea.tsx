import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-line text-ink placeholder:text-ink-muted focus-visible:border-brand-dark aria-invalid:border-danger min-h-28 w-full rounded-lg border bg-white px-3 py-2.5 text-base disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
