"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signUpAction } from "@/app/auth/actions";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Input } from "@/components/ui/input";
import { emptyFormState } from "@/lib/form-state";

type SignUpFormProps = {
  nextPath?: string;
};

export function SignUpForm({ nextPath }: SignUpFormProps) {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const [state, action] = useActionState(signUpAction, emptyFormState);

  if (state.notice === "checkEmail") {
    return (
      <FormAlert tone="success">
        {t("checkEmail", { email: state.values?.email ?? "" })}
      </FormAlert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? (
        <FormAlert tone="error">{errorMessage(state.error)}</FormAlert>
      ) : null}
      <input type="hidden" name="next" value={state.values?.next ?? nextPath ?? ""} />

      <Field
        id="fullName"
        label={t("fullName")}
        error={errorMessage(state.fieldErrors?.fullName)}
      >
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state.values?.fullName}
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={state.fieldErrors?.fullName ? "fullName-error" : undefined}
          required
        />
      </Field>

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
        hint={t("passwordHint")}
        error={errorMessage(state.fieldErrors?.password)}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          required
        />
      </Field>

      <SubmitButton size="lg" className="mt-2 w-full">
        {t("signUp")}
      </SubmitButton>
      <p className="text-ink-muted text-xs">{t("termsNote")}</p>
    </form>
  );
}
