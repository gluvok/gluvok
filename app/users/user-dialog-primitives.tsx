"use client";

import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Briefcase01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CrownIcon,
  HeadsetIcon,
  Key01Icon,
  SecurityCheckIcon,
  TextFontIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { ChevronsUpDownIcon } from "lucide-react";
import { FormDirtyIndicator } from "@/components/form-dirty-indicator";
import { type StaffRole } from "./types";

export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", icon: CrownIcon },
  { value: "manager", label: "Manager", icon: Briefcase01Icon },
  { value: "operator", label: "Operator", icon: HeadsetIcon },
  { value: "base", label: "Base User", icon: UserIcon },
];

/* -------------------------------------------------------------------------- */
/* Shell: Dialog Frame, Header, Error Banner, Dirty Indicator & Action Buttons */
/* -------------------------------------------------------------------------- */

interface UserDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  headerIcon: typeof UserIcon;
  formError: string | null;
  isDirty: boolean;
  isValid?: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  children: React.ReactNode;
}

export function UserDialogShell({
  open,
  onOpenChange,
  title,
  description,
  headerIcon,
  formError,
  isDirty,
  isValid = true,
  isSubmitting,
  onSubmit,
  submitLabel = "Save Changes",
  children,
}: UserDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={headerIcon} className="size-4" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            {description} Fields marked with{" "}
            <span className="text-destructive font-semibold">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid && isDirty && !isSubmitting) {
              onSubmit();
            }
          }}
          className="flex flex-col gap-4 py-2"
        >
          {formError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="size-4 shrink-0"
                data-icon="inline-start"
              />
              <span>{formError}</span>
            </div>
          )}

          {children}

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
                    <span>{submitLabel}</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Full Name Field                                                            */
/* -------------------------------------------------------------------------- */

interface FullNameFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
}

export function FullNameField({
  value,
  onChange,
  placeholder = "e.g. Alex Morgan",
  description = "Account holder or enterprise name.",
  error,
}: FullNameFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="user-name">
        <HugeiconsIcon icon={UserIcon} className="size-3.5 text-muted-foreground" />
        <span>Full Name</span>
        <span className="text-destructive font-semibold" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Input
        id="user-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="h-8 text-xs"
      />
      {error && <FieldError errors={[{ message: error }]} />}
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Credentials 2-Column Grid (Username & Password)                            */
/* -------------------------------------------------------------------------- */

interface CredentialsFieldsProps {
  username: string;
  setUsername: (val: string) => void;
  usernameError?: string;
  password: string;
  setPassword: (val: string) => void;
  passwordError?: string;
  isEdit: boolean;
  isPasswordRequired?: boolean;
  usernamePlaceholder?: string;
  usernameDescription?: string;
}

export function CredentialsFields({
  username,
  setUsername,
  usernameError,
  password,
  setPassword,
  passwordError,
  isEdit,
  isPasswordRequired = !isEdit,
  usernamePlaceholder = "e.g. alex_operator",
  usernameDescription = "Unique lowercase login handle.",
}: CredentialsFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field data-invalid={Boolean(usernameError)}>
        <FieldLabel htmlFor="user-username">
          <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
          <span>Username</span>
          <span className="text-destructive font-semibold" aria-hidden="true">
            *
          </span>
        </FieldLabel>
        <Input
          id="user-username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder={usernamePlaceholder}
          aria-invalid={Boolean(usernameError)}
          className="h-8 text-xs font-mono"
          autoComplete="off"
        />
        {usernameError && <FieldError errors={[{ message: usernameError }]} />}
        <FieldDescription>{usernameDescription}</FieldDescription>
      </Field>

      <Field data-invalid={Boolean(passwordError)}>
        <FieldLabel htmlFor="user-password">
          <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
          {isPasswordRequired ? (
            <>
              <span>Password</span>
              <span className="text-destructive font-semibold" aria-hidden="true">
                *
              </span>
            </>
          ) : (
            <span>New Password (Optional)</span>
          )}
        </FieldLabel>
        <PasswordInput
          id="user-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isPasswordRequired ? "At least 6 characters" : "Leave blank to keep current"}
          aria-invalid={Boolean(passwordError)}
          className="h-8 text-xs"
          autoComplete="new-password"
        />
        {passwordError && <FieldError errors={[{ message: passwordError }]} />}
        <FieldDescription>
          {isPasswordRequired ? "Minimum 6 characters." : "Leave blank to keep current password."}
        </FieldDescription>
      </Field>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Customer Portal Access Toggle Switch                                       */
/* -------------------------------------------------------------------------- */

interface CustomerPortalSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function CustomerPortalSwitch({ checked, onCheckedChange }: CustomerPortalSwitchProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">Enable Customer Portal Access</span>
        <span className="text-2xs text-muted-foreground">
          Allow customer to view weighing tickets online.
        </span>
      </div>
      <Switch id="portal-access-switch" checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* System Role Selector                                                       */
/* -------------------------------------------------------------------------- */

interface SystemRoleSelectProps {
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  error?: string;
}

export function SystemRoleSelect({ value, onChange, error }: SystemRoleSelectProps) {
  const selectedOpt = ROLE_OPTIONS.find((o) => o.value === value);
  const IconComponent = selectedOpt?.icon ?? SecurityCheckIcon;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="user-role">
        <HugeiconsIcon icon={SecurityCheckIcon} className="size-3.5 text-muted-foreground" />
        <span>System Role</span>
        <span className="text-destructive font-semibold" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Combobox
        data={ROLE_OPTIONS}
        type="role"
        value={value}
        onValueChange={(val) => {
          if (val) onChange(val as StaffRole);
        }}
      >
        <ComboboxTrigger
          id="user-role"
          className="h-8 w-full justify-between border-input bg-input/20 px-2.5 text-xs font-normal hover:bg-accent/50 dark:bg-input/30"
        >
          <span className="flex items-center gap-1.5 truncate">
            <HugeiconsIcon
              icon={IconComponent}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{selectedOpt?.label ?? "Select role..."}</span>
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </ComboboxTrigger>
        <ComboboxContent
          className="min-w-56"
          popoverOptions={{
            align: "start",
            sideOffset: 4,
          }}
        >
          <ComboboxInput placeholder="Search role..." className="h-8 text-xs" />
          <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">
            No role found.
          </ComboboxEmpty>
          <ComboboxList>
            <ComboboxGroup>
              {ROLE_OPTIONS.map((opt) => (
                <ComboboxItem key={opt.value} value={opt.value} className="text-xs">
                  <HugeiconsIcon
                    icon={opt.icon}
                    className="mr-1.5 size-3.5 text-muted-foreground"
                  />
                  <span>{opt.label}</span>
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <FieldError errors={[{ message: error }]} />}
      <FieldDescription>Permission tier for system access.</FieldDescription>
    </Field>
  );
}
