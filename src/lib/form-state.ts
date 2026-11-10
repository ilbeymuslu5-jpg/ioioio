/** useActionState ile kullanılan sunucu eylemi sonucu. Anahtarlar messages → errors / notices. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  notice?: string;
  values?: Record<string, string>;
};

export const emptyFormState: FormState = {};

export function formValues(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => {
      const value = formData.get(name);
      return [name, typeof value === "string" ? value : ""];
    }),
  );
}

type Issue = { path: PropertyKey[]; message: string };

export function fieldErrorsFromIssues(issues: Issue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
