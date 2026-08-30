"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicInput } from "@/components/ui/neumorphic/Input";

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
  const [fields, setFields] = useState<SignupFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        setServerError(data.error || "We could not create your account. Please try again.");
        return;
      }

      await refresh();
      router.replace("/");
      router.refresh();
    } catch {
      setServerError("We could not reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "authenticated") {
    return <p className="text-center text-sm text-[#9da2ad]" role="status">Your account is ready. Returning you home…</p>;
  }

  const passwordToggle = (
    <button
      type="button"
      className="flex size-9 items-center justify-center rounded-xl text-[#8d929e] transition-colors hover:text-[#d8b4fe]"
      onClick={() => setShowPassword((visible) => !visible)}
      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
    >
      {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
    </button>
  );

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Create your account</p>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#f3f0f6] sm:text-5xl">Make room for your sound.</h2>
      <p className="mt-4 text-sm leading-6 text-[#858a96]">Join as a listener today. Your same account can become a producer when you are ready.</p>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <NeumorphicInput label="First name" name="firstName" autoComplete="given-name" autoFocus value={fields.firstName} error={errors.firstName} onChange={(event) => updateField("firstName", event.target.value)} disabled={isSubmitting} />
          <NeumorphicInput label="Last name" name="lastName" autoComplete="family-name" value={fields.lastName} error={errors.lastName} onChange={(event) => updateField("lastName", event.target.value)} disabled={isSubmitting} />
        </div>
        <NeumorphicInput label="Email" type="email" name="email" autoComplete="email" value={fields.email} error={errors.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" disabled={isSubmitting} />
        <NeumorphicInput label="Phone (optional)" type="tel" name="phoneNumber" autoComplete="tel" value={fields.phoneNumber} error={errors.phoneNumber} hint="Use international E.164 format if supplied, for example +989121234567." onChange={(event) => updateField("phoneNumber", event.target.value)} placeholder="+989121234567" disabled={isSubmitting} />
        <NeumorphicInput label="Password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" value={fields.password} error={errors.password} hint="8–128 characters." onChange={(event) => updateField("password", event.target.value)} disabled={isSubmitting} trailing={passwordToggle} />
        <NeumorphicInput label="Confirm password" type={showPassword ? "text" : "password"} name="confirmPassword" autoComplete="new-password" value={fields.confirmPassword} error={errors.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} disabled={isSubmitting} />

        {serverError && <p className="rounded-2xl bg-[#ff6b8a]/8 px-4 py-3 text-sm leading-6 text-[#ff9bb0]" role="alert">{serverError}</p>}

        <NeumorphicButton type="submit" variant="accent" size="lg" className="mt-2 w-full" disabled={isSubmitting || status === "loading"}>
          {isSubmitting ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" /> Creating account…</> : "Create account"}
        </NeumorphicButton>
      </form>

      <p className="mt-8 text-center text-sm text-[#858a96]">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#c084fc] underline-offset-4 hover:underline">Login</Link>
      </p>
    </div>
  );
}
