import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAlertProps = {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
};

export function FormAlert({ tone, children, className }: FormAlertProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
        tone === "error"
          ? "border-danger text-danger bg-white"
          : "border-brand-light bg-brand-soft text-brand-dark",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
