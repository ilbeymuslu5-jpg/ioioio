import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
};

/** Etiket + alan + ipucu/hata. Alanın id'si `id`, hata metninin id'si `${id}-error` olmalıdır. */
export function Field({
  id,
  label,
  error,
  hint,
  optionalLabel,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optionalLabel ? (
          <span className="text-ink-muted ml-1 font-normal">({optionalLabel})</span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-ink-muted text-xs">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
