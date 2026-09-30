"use client";

/**
 * @file components/account/account-form.tsx
 * @description Self-edit account form for all authenticated users to manage profile and credentials.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, UserCircle, KeyRound } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { AppRoutes } from "@/lib/constants/routes";
import { accountSchema, type AccountInput } from "@/lib/validation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type AccountFormInput = AccountInput;

export function AccountForm() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<AccountFormInput>({
    resolver: standardSchemaResolver(accountSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  // Sync default values when user loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        username: user.username ?? "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: AccountFormInput) => {
    if (!user) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    const payload: Record<string, string> = {};
    const trimmedName = data.name.trim();
    const trimmedUsername = data.username.trim();

    if (trimmedName !== user.name) {
      payload.name = trimmedName;
    }
    if (trimmedUsername !== user.username) {
      payload.username = trimmedUsername;
    }
    if (data.password && data.password.trim().length > 0) {
      payload.password = data.password.trim();
      payload.confirmPassword = (data.confirmPassword ?? "").trim();
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.patch<{
        data: { id: number; name: string; username: string };
        is_self_password_changed?: boolean;
      }>(`/api/users/${user.id}`, payload);

      if (res.data?.is_self_password_changed) {
        toast.success("Password changed successfully. Please sign in again.");
        clearSession();
        window.location.href = `${AppRoutes.LOGIN}?reason=password_changed`;
        return;
      }

      // Update in-memory auth store
      updateUser({
        name: trimmedName,
        username: trimmedUsername,
      });

      // Clear password inputs
      form.setValue("password", "");
      form.setValue("confirmPassword", "");

      toast.success("Account profile updated successfully");
    } catch (err: unknown) {
      let message = "Failed to update account details";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle id="account-title">Personal Profile</CardTitle>
              <CardDescription id="account-description">
                Update your display name, login username, and access password.
              </CardDescription>
            </div>
          </div>
          {user?.role && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-semibold"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {user.role}
            </Badge>
          )}
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="account-name">Display Name</FieldLabel>
                <Input
                  id="account-name"
                  placeholder="Your full name"
                  disabled={submitting}
                  {...form.register("name")}
                />
                {form.formState.errors.name && <FieldError errors={[form.formState.errors.name]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="account-username">Username</FieldLabel>
                <Input
                  id="account-username"
                  placeholder="Unique username"
                  disabled={submitting}
                  {...form.register("username")}
                />
                {form.formState.errors.username && (
                  <FieldError errors={[form.formState.errors.username]} />
                )}
              </Field>
            </div>
          </FieldGroup>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Change Password</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Leave password blank if you do not wish to change it. Changing your password will
              require you to log in again.
            </p>

            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="account-password">New Password</FieldLabel>
                  <Input
                    id="account-password"
                    type="password"
                    placeholder="Min 6 characters"
                    disabled={submitting}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <FieldError errors={[form.formState.errors.password]} />
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="account-confirm-password">Confirm Password</FieldLabel>
                  <Input
                    id="account-confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    disabled={submitting}
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <FieldError errors={[form.formState.errors.confirmPassword]} />
                  )}
                </Field>
              </div>
            </FieldGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 mt-4">
          <Button
            type="submit"
            id="account-submit-btn"
            disabled={submitting}
            className="cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
