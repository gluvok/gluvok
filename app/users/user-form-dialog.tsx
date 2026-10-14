"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Briefcase01Icon,
  Cancel01Icon,
  CrownIcon,
  FloppyDiskIcon,
  HeadsetIcon,
  Key01Icon,
  SecurityCheckIcon,
  TextFontIcon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { ChevronsUpDownIcon } from "lucide-react";
import { createUserSchema, updateUserSchema, type User, type UserRole } from "./types";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", icon: CrownIcon },
  { value: "manager", label: "Manager", icon: Briefcase01Icon },
  { value: "operator", label: "Operator", icon: HeadsetIcon },
  { value: "base", label: "Base User", icon: UserIcon },
];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
  fixedRole?: UserRole;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  fixedRole,
}: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const isCustomer = fixedRole === "customer";
  const entityLabel = isCustomer ? "Customer" : "User";

  const [username, setUsername] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<UserRole>(fixedRole ?? "operator");
  const [password, setPassword] = useState<string>("");
  const [portalAccessEnabled, setPortalAccessEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever dialog opens or targeted user changes
  useEffect(() => {
    if (open) {
      if (user) {
        const existingUsername = user.username ?? "";
        setUsername(existingUsername);
        setName(user.name);
        setRole(user.role === "hardware" ? "operator" : user.role);
        setPassword("");
        setPortalAccessEnabled(Boolean(existingUsername));
      } else {
        setUsername("");
        setName("");
        setRole(fixedRole ?? "operator");
        setPassword("");
        setPortalAccessEnabled(false);
      }
      setFormError(null);
    }
  }, [open, user, fixedRole]);

  // Memorized baseline values for dirty state tracking
  const initialValues = useMemo(() => {
    return {
      username: user?.username ?? "",
      name: user?.name ?? "",
      role: user ? (user.role === "hardware" ? "operator" : user.role) : (fixedRole ?? "operator"),
    };
  }, [user, fixedRole]);

  // Live dirty state calculation comparing current values against initial baseline
  const isDirty = useMemo(() => {
    if (password.trim() !== "") return true;
    if (name.trim() !== initialValues.name.trim()) return true;
    if (username.trim().toLowerCase() !== initialValues.username.trim().toLowerCase()) return true;
    if (isCustomer && portalAccessEnabled !== Boolean(initialValues.username)) return true;
    if (!fixedRole && role !== initialValues.role) return true;
    return false;
  }, [password, name, username, isCustomer, portalAccessEnabled, role, initialValues, fixedRole]);

  // Form validity check for enabling/disabling submit button
  const isValid = useMemo(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 1) return false;

    if (isCustomer) {
      if (!portalAccessEnabled) return true;
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();
      if (trimmedUser.length < 3) return false;
      if (!isEdit && trimmedPass.length < 6) return false;
      if (isEdit && !user?.username && trimmedPass.length < 6) return false;
      if (trimmedPass.length > 0 && trimmedPass.length < 6) return false;
      return true;
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    if (trimmedUser.length < 3) return false;
    if (!isEdit && trimmedPass.length < 6) return false;
    if (trimmedPass.length > 0 && trimmedPass.length < 6) return false;
    return true;
  }, [name, isCustomer, portalAccessEnabled, username, password, isEdit, user]);

  const handleSubmit = async () => {
    setFormError(null);

    const effectiveUsername =
      isCustomer && !portalAccessEnabled ? "" : username.toLowerCase().trim();
    const effectivePassword = isCustomer && !portalAccessEnabled ? "" : password.trim();

    const payload = isEdit
      ? {
          id: user!.id,
          username: effectiveUsername,
          name: name.trim(),
          role,
          password: effectivePassword,
        }
      : {
          username: effectiveUsername,
          name: name.trim(),
          role,
          password: effectivePassword,
        };

    const validation = isEdit
      ? updateUserSchema.safeParse(payload)
      : createUserSchema.safeParse(payload);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid input";
      setFormError(firstIssue);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit) {
        await axios.patch("/api/users", payload);
        toast.add({
          type: "success",
          title: `${entityLabel} updated`,
          description: payload.username
            ? `Account "${payload.username}" has been successfully updated.`
            : `${entityLabel} "${payload.name}" has been successfully updated.`,
        });
      } else {
        await axios.post("/api/users", payload);
        toast.add({
          type: "success",
          title: `${entityLabel} created`,
          description: payload.username
            ? `Account "${payload.username}" has been created successfully.`
            : `${entityLabel} "${payload.name}" has been created successfully.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred.";

      setFormError(msg);
      toast.add({
        type: "error",
        title: isEdit
          ? `Failed to update ${entityLabel.toLowerCase()}`
          : `Failed to create ${entityLabel.toLowerCase()}`,
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={isEdit ? UserEdit01Icon : UserAdd01Icon} className="size-4" />
            </div>
            <DialogTitle>{isEdit ? `Edit ${entityLabel}` : `Add New ${entityLabel}`}</DialogTitle>
          </div>
          <DialogDescription>
            {isCustomer
              ? isEdit
                ? "Modify portal credentials or update account information."
                : "Register a new agricultural supplier or customer profile."
              : isEdit
                ? "Modify account credentials and system role."
                : "Provision a new system operator or staff account."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
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

          {/* Full Name */}
          <Field>
            <FieldLabel htmlFor="user-name">
              <HugeiconsIcon icon={UserIcon} className="size-3.5 text-muted-foreground" />
              Full Name
            </FieldLabel>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCustomer ? "e.g. Ramesh Kumar" : "e.g. Alex Morgan"}
              className="h-8 text-xs"
            />
            <FieldDescription>
              {isCustomer
                ? "Customer or enterprise name on delivery tickets."
                : "Operator name displayed in audit trails."}
            </FieldDescription>
          </Field>

          {/* Enable Customer Portal Access Switch */}
          {isCustomer && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium">Enable Customer Portal Access</span>
                <span className="text-2xs text-muted-foreground">
                  Allow customer to view weighing tickets online.
                </span>
              </div>
              <Switch
                id="portal-access-switch"
                checked={portalAccessEnabled}
                onCheckedChange={(checked) => {
                  setPortalAccessEnabled(checked);
                  if (!checked) {
                    setUsername("");
                    setPassword("");
                  }
                }}
              />
            </div>
          )}

          {/* Credentials section: shown if staff, or if customer with portal access enabled */}
          {(!isCustomer || portalAccessEnabled) && (
            <div className="flex flex-col gap-4">
              {/* Username */}
              <Field>
                <FieldLabel htmlFor="user-username">
                  <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
                  Username
                </FieldLabel>
                <Input
                  id="user-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder={isCustomer ? "e.g. kisan_ramesh" : "e.g. alex_operator"}
                  className="h-8 text-xs font-mono"
                  autoComplete="off"
                />
                <FieldDescription>
                  {isCustomer ? "Lowercase portal login handle." : "Unique lowercase login handle."}
                </FieldDescription>
              </Field>

              {/* Password */}
              <Field>
                <FieldLabel htmlFor="user-password">
                  <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
                  {isEdit ? "New Password (Optional)" : "Password"}
                </FieldLabel>
                <PasswordInput
                  id="user-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isEdit ? "Leave blank to keep current password" : "At least 6 characters"
                  }
                  className="h-8 text-xs"
                  autoComplete="new-password"
                />
                <FieldDescription>
                  {isEdit ? "Leave blank to keep current password." : "Minimum 6 characters."}
                </FieldDescription>
              </Field>
            </div>
          )}

          {/* Role (hidden when role is fixed e.g. customer) */}
          {!fixedRole && (
            <Field>
              <FieldLabel htmlFor="user-role">
                <HugeiconsIcon
                  icon={SecurityCheckIcon}
                  className="size-3.5 text-muted-foreground"
                />
                System Role
              </FieldLabel>
              <Combobox
                data={ROLE_OPTIONS}
                type="role"
                value={role}
                onValueChange={(val) => {
                  if (val) setRole(val as UserRole);
                }}
              >
                <ComboboxTrigger
                  id="user-role"
                  className="h-8 w-full justify-between border-input bg-input/20 px-2.5 text-xs font-normal hover:bg-accent/50 dark:bg-input/30"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {(() => {
                      const selectedOpt = ROLE_OPTIONS.find((o) => o.value === role);
                      const IconComponent = selectedOpt?.icon ?? SecurityCheckIcon;
                      return (
                        <>
                          <HugeiconsIcon
                            icon={IconComponent}
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{selectedOpt?.label ?? "Select role..."}</span>
                        </>
                      );
                    })()}
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
              <FieldDescription>Permission tier for system access.</FieldDescription>
            </Field>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full gap-2 pt-2">
          <div className="mr-auto flex items-center gap-2 text-2xs text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
              )}
            />
            <span>{isDirty ? "You have unsaved changes." : "All changes saved."}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 gap-1.5 text-xs"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" data-icon="inline-start" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !isDirty || !isValid}
              className="h-8 gap-1.5 text-xs"
            >
              {isSubmitting ? (
                <Spinner className="size-3.5" data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={isEdit ? FloppyDiskIcon : UserAdd01Icon}
                  className="size-3.5"
                  data-icon="inline-start"
                />
              )}
              {isEdit ? "Save Changes" : `Create ${entityLabel}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
