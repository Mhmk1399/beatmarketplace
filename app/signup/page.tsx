import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your BeatMarketplace account.",
};

export default function SignupPage() {
  return (
    <AuthSplitLayout mode="signup">
      <SignupForm />
    </AuthSplitLayout>
  );
}
