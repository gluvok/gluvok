"use client";

/**
 * @file components/auth/form/login.tsx
 * @description Sign in form component using username and password with Argon2/Session backend.
 */

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard, AuthInput } from "@/components/auth/common";
import { useAuthStore } from "@/lib/store";
import { cn, getNextParam } from "@/lib/utils";
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
      router.push(targetRedirect);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthCard
        title="Welcome back"
        description="Enter your username and password to login to your account"
      >
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
