import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterChip = {
  label: string;
  href: string;
  isActive: boolean;
};

type FilterChipsProps = {
  label: string;
  chips: FilterChip[];
};

export function FilterChips({ label, chips }: FilterChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((chip) => (
          <li key={chip.href} className="shrink-0">
            <Link
              href={chip.href}
              aria-current={chip.isActive ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                chip.isActive
                  ? "border-brand-dark bg-brand-dark text-white"
                  : "border-line text-ink hover:border-brand-dark hover:bg-brand-soft bg-white",
              )}
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
