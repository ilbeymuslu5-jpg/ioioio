import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  id: string;
  defaultValue?: string;
  /** Aramada korunacak diğer filtreler. */
  hiddenParams?: Record<string, string | undefined>;
  className?: string;
};

/** JavaScript gerektirmeyen GET formu: /ilanlar?q=... */
export function SearchForm({
  id,
  defaultValue,
  hiddenParams,
  className,
}: SearchFormProps) {
  const t = useTranslations("search");

  return (
    <form
      action={routes.listings}
      role="search"
      className={cn(
        "border-line shadow-soft focus-within:border-brand-dark flex items-center gap-2 rounded-xl border bg-white p-1.5",
        className,
      )}
    >
      {Object.entries(hiddenParams ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <Search aria-hidden="true" className="text-ink-muted ml-2 size-5 shrink-0" />
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        className="text-ink placeholder:text-ink-muted h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
      />
      <Button type="submit" size="md">
        {t("submit")}
      </Button>
    </form>
  );
}
