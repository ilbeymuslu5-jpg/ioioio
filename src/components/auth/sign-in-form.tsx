"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction } from "@/app/auth/actions";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Input } from "@/components/ui/input";
import { emptyFormState } from "@/lib/form-state";

type SignInFormProps = {
  nextPath?: string;
  initialError?: string;
};

export function SignInForm({ nextPath, initialError }: SignInFormProps) {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const [state, action] = useActionState(signInAction, emptyFormState);
  const formError = state.error ?? (state.fieldErrors ? undefined : initialError);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {formError ? <FormAlert tone="error">{errorMessage(formError)}</FormAlert> : null}
      <input type="hidden" name="next" value={state.values?.next ?? nextPath ?? ""} />

      <Field id="email" label={t("email")} error={errorMessage(state.fieldErrors?.email)}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          required
        />
      </Field>

      <Field
        id="password"
        label={t("password")}
        error={errorMessage(state.fieldErrors?.password)}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          required
        />
      </Field>

      <SubmitButton size="lg" className="mt-2 w-full">
        {t("signIn")}
      </SubmitButton>
    </form>
  );
}
