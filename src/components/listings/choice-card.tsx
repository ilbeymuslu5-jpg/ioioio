import * as React from "react";
import { cn } from "@/lib/utils";

type ChoiceCardProps = Omit<React.ComponentProps<"input">, "type"> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  compact?: boolean;
};

/** Kart görünümlü radyo düğmesi. Aynı `name` ile gruplanır; klavye ile gezilebilir. */
export function ChoiceCard({
  title,
  description,
  icon,
  compact = false,
  className,
  ...props
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "border-line has-checked:border-brand-dark has-checked:bg-brand-soft has-focus-visible:outline-brand-dark hover:border-brand-dark flex cursor-pointer items-center gap-3 rounded-xl border bg-white transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        compact ? "min-h-11 px-3 py-2" : "p-4",
        className,
      )}
    >
      <input type="radio" className="sr-only" {...props} />
      {icon ? (
        <span
          aria-hidden="true"
          className="bg-brand-soft text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-lg"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="text-ink block text-sm font-semibold">{title}</span>
        {description ? (
          <span className="text-ink-muted mt-0.5 block text-xs">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
