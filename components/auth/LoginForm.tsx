"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { NeumorphicInput } from "@/components/ui/neumorphic/Input";

type LoginFields = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof LoginFields, string>>;

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
  const [fields, setFields] = useState<LoginFields>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        setServerError(data.error === "Invalid credentials." ? "The email or password is incorrect." : data.error || "We could not sign you in. Please try again.");
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
    return <p className="text-center text-sm text-[#9da2ad]" role="status">Returning you home…</p>;
  }

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Welcome back</p>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#f3f0f6] sm:text-5xl">Login to your sound.</h2>
      <p className="mt-4 text-sm leading-6 text-[#858a96]">Use the email and password connected to your BeatMarketplace account.</p>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
        <NeumorphicInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          autoFocus
          value={fields.email}
          error={errors.email}
          onChange={(event) => setFields((current) => ({ ...current, email: event.target.value }))}
          placeholder="you@example.com"
          disabled={isSubmitting}
        />
        <NeumorphicInput
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          value={fields.password}
          error={errors.password}
          onChange={(event) => setFields((current) => ({ ...current, password: event.target.value }))}
          placeholder="Your password"
          disabled={isSubmitting}
          trailing={
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-xl text-[#8d929e] transition-colors hover:text-[#d8b4fe]"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          }
        />

        {serverError && <p className="rounded-2xl bg-[#ff6b8a]/8 px-4 py-3 text-sm leading-6 text-[#ff9bb0]" role="alert">{serverError}</p>}

        <NeumorphicButton type="submit" variant="accent" size="lg" className="mt-2 w-full" disabled={isSubmitting || status === "loading"}>
          {isSubmitting ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" /> Signing in…</> : "Login"}
        </NeumorphicButton>
      </form>

      <p className="mt-8 text-center text-sm text-[#858a96]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-[#c084fc] underline-offset-4 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
