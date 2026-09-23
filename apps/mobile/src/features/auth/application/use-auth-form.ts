import { useState } from "react";
import type { z } from "zod";

import { ApiError } from "@/core/api/http";
import { getFieldErrors } from "../domain/auth-forms";

/**
 * State of a login/registration form validated by a zod schema. Field
 * errors come from the schema; `formError` holds the API's refusal (or a
 * generic `fallbackError` for unexpected failures). Both live only in the
 * form, so switching forms never shows a stale message.
 */
export function useAuthForm<TValues extends Record<string, unknown>, TParsed>({
  fallbackError,
  initialValues,
  onSubmit,
  schema,
}: Readonly<{
  fallbackError: string;
  initialValues: TValues;
  onSubmit: (values: TParsed) => Promise<void>;
  schema: z.ZodType<TParsed>;
}>) {
  type Field = Extract<keyof TValues, string>;
  const [values, setValues] = useState<TValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<Field, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = <K extends Field>(field: K, value: TValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    if (submitting) return;
    const parsed = schema.safeParse(values);
    setFormError(null);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors<Field>(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : fallbackError);
    } finally {
      setSubmitting(false);
    }
  };

  return { fieldErrors, formError, setValue, submit, submitting, values };
}
