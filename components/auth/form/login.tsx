"use client";

/**
 * @file components/auth/form/login.tsx
 * @description Sign in form component using username and password with Argon2/Session backend.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard, AuthInput } from "@/components/auth/common";
import { useAuthStore } from "@/lib/store";
import { cn, getNextParam, getReasonParam } from "@/lib/utils";
import { AppRoutes } from "@/lib/constants/routes";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

/**
 * LoginForm Component
 * Handles the login interface, input validation, authentication request,
 * and redirecting the user upon success.
 */
export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [reason, setReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    setReason(getReasonParam());
  }, []);

  const form = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    const targetRedirect = getNextParam() || AppRoutes.HOME;
    const success = await login(data.username, data.password);

    if (success) {
      // Strip query params so AuthGuard doesn't clear the session we just set
      window.history.replaceState({}, "", window.location.pathname);
      router.push(targetRedirect);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthCard
        title="Welcome back"
        description="Enter your username and password to login to your account"
      >
        {reason === "session_expired" && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Session Expired</p>
              <p className="text-muted-foreground dark:text-amber-200/80 leading-relaxed">
                Your session has expired or your credentials were updated. Please sign in again to
                continue.
              </p>
            </div>
          </div>
        )}
        {reason === "password_changed" && (
          <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5 animate-in fade-in duration-200">
            <KeyRound className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <p className="font-semibold text-blue-800 dark:text-blue-300">Password Changed</p>
              <p className="text-muted-foreground dark:text-blue-200/80 leading-relaxed">
                Your password was recently changed. Please log in with your new credentials.
              </p>
            </div>
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <AuthInput
              id="username"
              label="Username"
              type="text"
              placeholder="e.g. admin123"
              registration={form.register("username")}
              error={form.formState.errors.username}
            />
            <AuthInput
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              registration={form.register("password")}
              error={form.formState.errors.password}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </FieldGroup>
        </form>
      </AuthCard>
    </div>
  );
}
