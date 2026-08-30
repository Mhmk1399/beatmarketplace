import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your BeatMarketplace account.",
};

export default function LoginPage() {
  return (
    <AuthSplitLayout mode="login">
      <LoginForm />
    </AuthSplitLayout>
  );
}
