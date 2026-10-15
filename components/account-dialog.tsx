"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { FormDirtyIndicator } from "@/components/form-dirty-indicator";
import { RoleBadge } from "@/components/role-badge";
import { toast } from "@/components/ui/toast";
import { cn, formatDateTime, getErrorMessage } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Key01Icon,
  TextFontIcon,
  UserCircleIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { nameSchema, usernameSchema, passwordSchema, type User } from "@/app/users/types";

const accountFormSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  password: passwordSchema.optional().or(z.literal("")),
});

type AccountFormInput = z.infer<typeof accountFormSchema>;

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: (user: User) => void;
}

function getInitialAccountValues(user: User | null): AccountFormInput {
  return {
    name: user?.name ?? "",
    username: user?.username ?? "",
    password: "",
  };
}

export function AccountDialog({ open, onOpenChange, user, onUserUpdated }: AccountDialogProps) {
  const [accountUser, setAccountUser] = useState<User | null>(user);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const displayUser = accountUser ?? user;

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<AccountFormInput>({
    resolver: zodResolver(accountFormSchema),
    mode: "onChange",
    defaultValues: getInitialAccountValues(user),
  });

  const name = watch("name");
  const username = watch("username");
  const password = watch("password");

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      setFormError(null);
      const response = await axios.get<{ data: User }>("/api/users/me");
      const freshUser = response.data.data;
      setAccountUser(freshUser);
      reset(getInitialAccountValues(freshUser));
      onUserUpdated(freshUser);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to load account profile."));
    } finally {
      setLoading(false);
    }
  }, [reset, onUserUpdated]);

  useEffect(() => {
    if (open) {
      fetchMe();
    }
  }, [open, fetchMe]);

  const onSubmit = async (values: AccountFormInput) => {
    try {
      setFormError(null);
      const payload = {
        name: values.name.trim(),
        username: values.username.trim().toLowerCase(),
        ...(values.password && values.password.trim() ? { password: values.password.trim() } : {}),
      };

      const response = await axios.patch<{ data: User; message: string }>("/api/users/me", payload);

      toast.add({
        type: "success",
        title: "Account Updated",
        description: response.data.message || "Your profile has been saved successfully.",
      });

      setAccountUser(response.data.data);
      onUserUpdated(response.data.data);
      onOpenChange(false);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to update account profile."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
            <DialogTitle>Account Settings</DialogTitle>
          </div>
          <DialogDescription>Personal profile and account credentials.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
              <Spinner className="size-6 text-primary" />
            </div>
          )}

          <div
            className={cn(
              "flex flex-col gap-4 py-2 transition-opacity",
              loading ? "pointer-events-none opacity-40 select-none" : "opacity-100",
            )}
          >
            {displayUser && (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned Role</span>
                  <RoleBadge role={displayUser.role} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <HugeiconsIcon icon={Calendar01Icon} className="size-3" />
                    <span>Member Since</span>
                  </span>
                  <span className="text-foreground">{formatDateTime(displayUser.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <HugeiconsIcon icon={Clock01Icon} className="size-3" />
                    <span>Last Updated</span>
                  </span>
                  <span className="text-foreground">{formatDateTime(displayUser.updated_at)}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <p className="text-2xs text-muted-foreground">
                <span className="text-destructive font-semibold">*</span> indicates required field
              </p>
              {formError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="account-name">
                  <HugeiconsIcon icon={UserIcon} className="size-3.5 text-muted-foreground" />
                  <span>Full Name</span>
                  <span className="text-destructive font-semibold" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(e) =>
                    setValue("name", e.target.value, { shouldValidate: true, shouldDirty: true })
                  }
                  placeholder="e.g. Alex Morgan"
                  aria-invalid={Boolean(errors.name)}
                  className="h-8 text-xs"
                />
                {errors.name && <FieldError errors={[{ message: errors.name.message }]} />}
                <FieldDescription>Your legal or administrative display name.</FieldDescription>
              </Field>

              <Field data-invalid={Boolean(errors.username)}>
                <FieldLabel htmlFor="account-username">
                  <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
                  <span>Username</span>
                  <span className="text-destructive font-semibold" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="account-username"
                  value={username}
                  onChange={(e) =>
                    setValue("username", e.target.value.toLowerCase(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="e.g. admin1"
                  aria-invalid={Boolean(errors.username)}
                  className="h-8 text-xs font-mono"
                  autoComplete="off"
                />
                {errors.username && <FieldError errors={[{ message: errors.username.message }]} />}
                <FieldDescription>Unique lowercase system login handle.</FieldDescription>
              </Field>

              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="account-password">
                  <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
                  <span>New Password (Optional)</span>
                </FieldLabel>
                <PasswordInput
                  id="account-password"
                  value={password || ""}
                  onChange={(e) =>
                    setValue("password", e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="Leave blank to keep current password"
                  aria-invalid={Boolean(errors.password)}
                  className="h-8 text-xs"
                  autoComplete="new-password"
                />
                {errors.password && <FieldError errors={[{ message: errors.password.message }]} />}
                <FieldDescription>Leave empty to keep your existing password.</FieldDescription>
              </Field>

              <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full gap-2 pt-2">
                <FormDirtyIndicator isDirty={isDirty} className="mr-auto" />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      className="size-3.5 text-muted-foreground"
                      data-icon="inline-start"
                    />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !isDirty || !isValid}
                    className="min-w-28"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="size-3.5" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
