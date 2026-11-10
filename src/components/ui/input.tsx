import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-line text-ink placeholder:text-ink-muted focus-visible:border-brand-dark aria-invalid:border-danger h-11 w-full rounded-lg border bg-white px-3 text-base disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
