"use client";

/**
 * @file app/login/page.tsx
 * @description Authentication login page.
 * Renders the LoginForm within the common AuthPageLayout wrapper.
 */

import { LoginForm } from "@/components/auth/form";
import { AuthPageLayout } from "@/components/auth/common";

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
