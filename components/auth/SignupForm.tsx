"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { useToast } from "@/components/ui/toast/ToastProvider";

type SignupFields = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof SignupFields, string>>;

const initialFields: SignupFields = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
};

const signupFields = [
  { name: "firstName", label: "First name", autoComplete: "given-name", autoFocus: true, required: true, colSpan: 1 },
  { name: "lastName", label: "Last name", autoComplete: "family-name", required: true, colSpan: 1 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com", required: true },
  { name: "phoneNumber", label: "Phone (optional)", type: "tel", autoComplete: "tel", placeholder: "+989121234567", hint: "Use international E.164 format if supplied, for example +989121234567." },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "8–128 characters.", required: true, revealable: true },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", required: true, revealable: true },
] satisfies readonly DynamicFormField<SignupFields>[];

function validateSignup(fields: SignupFields) {
  const errors: FieldErrors = {};
  if (!fields.firstName.trim()) errors.firstName = "First name is required.";
  else if (fields.firstName.trim().length > 80) errors.firstName = "Use 80 characters or fewer.";
  if (!fields.lastName.trim()) errors.lastName = "Last name is required.";
  else if (fields.lastName.trim().length > 80) errors.lastName = "Use 80 characters or fewer.";
  if (!fields.email.trim()) errors.email = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(fields.email) || fields.email.length > 254) errors.email = "Enter a valid email address.";
  if (fields.phoneNumber && !/^\+[1-9]\d{7,14}$/.test(fields.phoneNumber)) errors.phoneNumber = "Use international format, for example +989121234567.";
  if (fields.password.length < 8) errors.password = "Password must contain at least 8 characters.";
  else if (fields.password.length > 128) errors.password = "Password must contain no more than 128 characters.";
  if (!fields.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (fields.confirmPassword !== fields.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function SignupForm() {
  const router = useRouter();
  const { refresh, status } = useAuth();
  const toast = useToast();
  const [fields, setFields] = useState<SignupFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [router, status]);

  function updateField(field: keyof SignupFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const nextErrors = validateSignup(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fields.firstName.trim(),
          lastName: fields.lastName.trim(),
          email: fields.email.trim(),
          phoneNumber: fields.phoneNumber || undefined,
          password: fields.password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: Array<{ field: string; message: string }>;
      };

      if (!response.ok) {
        const fieldErrors: FieldErrors = {};
        data.issues?.forEach((issue) => {
          if (issue.field in initialFields) fieldErrors[issue.field as keyof SignupFields] = issue.message;
        });
        setErrors(fieldErrors);
        const message = data.error || "We could not create your account. Please try again.";
        setServerError(message);
        toast.error("Account creation failed", message);
        return;
      }

      await refresh();
      toast.success("Account created", "Welcome to BeatMarketplace.");
      router.replace("/");
      router.refresh();
    } catch {
      const message = "We could not reach the server. Check your connection and try again.";
      setServerError(message);
      toast.error("Connection error", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "authenticated") {
    return <p className="text-center text-sm text-[#9da2ad]" role="status">Your account is ready. Returning you home…</p>;
  }

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Create your account</p>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#f3f0f6] sm:text-5xl">Make room for your sound.</h2>
      <p className="mt-4 text-sm leading-6 text-[#858a96]">Join as a listener today. Your same account can become a producer when you are ready.</p>

      <DynamicForm
        className="mt-9"
        columns={2}
        fields={signupFields}
        values={fields}
        errors={errors}
        formError={serverError}
        isSubmitting={isSubmitting}
        disabled={status === "loading"}
        submitLabel="Create account"
        submittingLabel="Creating account…"
        fullWidthSubmit
        onValueChange={(name, value) => updateField(name, String(value))}
        onSubmit={handleSubmit}
      />

      <p className="mt-8 text-center text-sm text-[#858a96]">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#c084fc] underline-offset-4 hover:underline">Login</Link>
      </p>
    </div>
  );
}
