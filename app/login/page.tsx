/**
 * @file app/login/page.tsx
 * @description Authentication login page.
 * Renders the LoginForm within the common AuthPageLayout wrapper.
 */

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/form";
import { AuthPageLayout } from "@/components/auth/common";

export const metadata: Metadata = {
  title: "Login | gluvok Dashboard",
  description: "Sign in to access your gluvok dashboard.",
};

/**
 * LoginPage Component
 * Entry-point page for user authentication.
 */
export default function LoginPage() {
  return (
    <AuthPageLayout>
      <LoginForm />
    </AuthPageLayout>
  );
}
