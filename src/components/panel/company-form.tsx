"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveCompanyAction } from "@/app/panel/firma/actions";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/companies/schema";
import { emptyFormState } from "@/lib/form-state";
import { cities, priorityCities } from "@/lib/locations";

type CompanyFormProps = {
  company: Company | null;
  nextPath?: string;
};

export function CompanyForm({ company, nextPath }: CompanyFormProps) {
  const t = useTranslations("company");
  const errorMessage = useErrorMessage();
  const [state, action] = useActionState(saveCompanyAction, emptyFormState);

  const value = (name: string, fallback: string | null | undefined) =>
    state.values?.[name] ?? fallback ?? "";
  const fieldError = (name: string) => errorMessage(state.fieldErrors?.[name]);
  const invalid = (name: string) => ({
    "aria-invalid": Boolean(state.fieldErrors?.[name]),
    "aria-describedby": state.fieldErrors?.[name] ? `${name}-error` : undefined,
  });
  const otherCities = cities.filter(
    (city) => !(priorityCities as readonly string[]).includes(city),
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? (
        <FormAlert tone="error">{errorMessage(state.error)}</FormAlert>
      ) : null}
      <input type="hidden" name="next" value={state.values?.next ?? nextPath ?? ""} />

      <Field id="name" label={t("name")} error={fieldError("name")}>
        <Input
          id="name"
          name="name"
          autoComplete="organization"
          defaultValue={value("name", company?.name)}
          {...invalid("name")}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="phone"
          label={t("phone")}
          hint={t("phoneHint")}
          error={fieldError("phone")}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0532 000 00 00"
            defaultValue={value("phone", company?.phone)}
            {...invalid("phone")}
            required
          />
        </Field>
        <Field
          id="taxNumber"
          label={t("taxNumber")}
          optionalLabel={t("optional")}
          error={fieldError("taxNumber")}
        >
          <Input
            id="taxNumber"
            name="taxNumber"
            inputMode="numeric"
            defaultValue={value("taxNumber", company?.taxNumber)}
            {...invalid("taxNumber")}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="city" label={t("city")} error={fieldError("city")}>
          <Select
            id="city"
            name="city"
            defaultValue={value("city", company?.city)}
            {...invalid("city")}
            required
          >
            <option value="">{t("cityPlaceholder")}</option>
            <optgroup label={t("aegeanCities")}>
              {priorityCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("otherCities")}>
              {otherCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Field
          id="district"
          label={t("district")}
          optionalLabel={t("optional")}
          error={fieldError("district")}
        >
          <Input
            id="district"
            name="district"
            defaultValue={value("district", company?.district)}
            {...invalid("district")}
          />
        </Field>
      </div>

      <Field
        id="sector"
        label={t("sector")}
        optionalLabel={t("optional")}
        hint={t("sectorHint")}
        error={fieldError("sector")}
      >
        <Input
          id="sector"
          name="sector"
          defaultValue={value("sector", company?.sector)}
          {...invalid("sector")}
        />
      </Field>

      <Field
        id="description"
        label={t("description")}
        optionalLabel={t("optional")}
        error={fieldError("description")}
      >
        <Textarea
          id="description"
          name="description"
          defaultValue={value("description", company?.description)}
          {...invalid("description")}
        />
      </Field>

      <SubmitButton size="lg" className="mt-2 w-full sm:w-auto sm:self-start">
        {company ? t("save") : t("create")}
      </SubmitButton>
    </form>
  );
}
