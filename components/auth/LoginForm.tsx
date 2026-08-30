"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicForm, type DynamicFormField } from "@/components/ui/dynamic/DynamicForm";
import { useToast } from "@/components/ui/toast/ToastProvider";

type LoginFields = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof LoginFields, string>>;

const loginFields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email", autoFocus: true, placeholder: "you@example.com", required: true },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password", placeholder: "Your password", required: true, revealable: true },
] satisfies readonly DynamicFormField<LoginFields>[];

function validateLogin(fields: LoginFields) {
  const errors: FieldErrors = {};
  if (!fields.email.trim()) errors.email = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(fields.email) || fields.email.length > 254) errors.email = "Enter a valid email address.";
  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length > 128) errors.password = "Password is too long.";
  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const { refresh, status } = useAuth();
  const toast = useToast();
  const [fields, setFields] = useState<LoginFields>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const nextErrors = validateLogin(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.email.trim(), password: fields.password }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: Array<{ field: string; message: string }>;
      };

      if (!response.ok) {
        const fieldErrors: FieldErrors = {};
        data.issues?.forEach((issue) => {
          if (issue.field === "email" || issue.field === "password") fieldErrors[issue.field] = issue.message;
        });
        setErrors(fieldErrors);
        const message = data.error === "Invalid credentials." ? "The email or password is incorrect." : data.error || "We could not sign you in. Please try again.";
        setServerError(message);
        toast.error("Login failed", message);
        return;
      }

      await refresh();
      toast.success("Welcome back", "Your session is ready.");
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
    return <p className="text-center text-sm text-[#9da2ad]" role="status">Returning you home…</p>;
  }

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Welcome back</p>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#f3f0f6] sm:text-5xl">Login to your sound.</h2>
      <p className="mt-4 text-sm leading-6 text-[#858a96]">Use the email and password connected to your BeatMarketplace account.</p>

      <DynamicForm
        className="mt-9"
        fields={loginFields}
        values={fields}
        errors={errors}
        formError={serverError}
        isSubmitting={isSubmitting}
        disabled={status === "loading"}
        submitLabel="Login"
        submittingLabel="Signing in…"
        fullWidthSubmit
        onValueChange={(name, value) => {
          setFields((current) => ({ ...current, [name]: value }));
          setErrors((current) => ({ ...current, [name]: undefined }));
        }}
        onSubmit={handleSubmit}
      />

      <p className="mt-8 text-center text-sm text-[#858a96]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-[#c084fc] underline-offset-4 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
