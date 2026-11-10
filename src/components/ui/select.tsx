import * as React from "react";
import { cn } from "@/lib/utils";

/** Yerel <select>: mobilde işletim sisteminin kendi seçicisini açar. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-line text-ink focus-visible:border-brand-dark aria-invalid:border-danger h-11 w-full rounded-lg border bg-white px-3 text-base disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
