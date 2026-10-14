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
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
  const [portalViewMode, setPortalViewMode] = useState<"switch" | "inline">("switch");
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
    if (!fixedRole && role !== initialValues.role) return true;
    return false;
  }, [password, name, username, role, initialValues, fixedRole]);

  // Form validity check for enabling/disabling submit button
  const isValid = useMemo(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 1) return false;

    if (isCustomer) {
      if (portalViewMode === "switch") {
        if (!portalAccessEnabled) return true;
        const trimmedUser = username.trim();
        const trimmedPass = password.trim();
        if (trimmedUser.length < 3) return false;
        if (!isEdit && trimmedPass.length < 6) return false;
        if (isEdit && !user?.username && trimmedPass.length < 6) return false;
        if (trimmedPass.length > 0 && trimmedPass.length < 6) return false;
        return true;
      } else {
        const trimmedUser = username.trim();
        const trimmedPass = password.trim();
        if (trimmedUser.length === 0 && trimmedPass.length === 0) return true;
        if (trimmedUser.length > 0 && trimmedUser.length < 3) return false;
        if (trimmedPass.length > 0 && trimmedPass.length < 6) return false;
        if (trimmedUser.length > 0 && !isEdit && trimmedPass.length < 6) return false;
        if (trimmedUser.length > 0 && isEdit && !user?.username && trimmedPass.length < 6)
          return false;
        if (trimmedPass.length >= 6 && trimmedUser.length === 0) return false;
        return true;
      }
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    if (trimmedUser.length < 3) return false;
    if (!isEdit && trimmedPass.length < 6) return false;
    if (trimmedPass.length > 0 && trimmedPass.length < 6) return false;
    return true;
  }, [name, isCustomer, portalViewMode, portalAccessEnabled, username, password, isEdit, user]);

  const handlePortalViewModeChange = (mode: "switch" | "inline") => {
    setPortalViewMode(mode);
    if (mode === "switch") {
      setPortalAccessEnabled(Boolean(username.trim()));
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    const effectiveUsername =
      isCustomer && portalViewMode === "switch" && !portalAccessEnabled
        ? ""
        : username.toLowerCase().trim();
    const effectivePassword =
      isCustomer && portalViewMode === "switch" && !portalAccessEnabled ? "" : password.trim();

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
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              {formError}
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

          {/* Customer Portal Access Toggle Mode */}
          {isCustomer && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium">Portal Access Layout</span>
                <span className="text-2xs text-muted-foreground">
                  Choose how to configure credentials.
                </span>
              </div>
              <ButtonGroup>
                <Button
                  type="button"
                  variant={portalViewMode === "switch" ? "default" : "outline"}
                  size="xs"
                  className="h-7 text-2xs"
                  onClick={() => handlePortalViewModeChange("switch")}
                >
                  Switch View
                </Button>
                <Button
                  type="button"
                  variant={portalViewMode === "inline" ? "default" : "outline"}
                  size="xs"
                  className="h-7 text-2xs"
                  onClick={() => handlePortalViewModeChange("inline")}
                >
                  Inline View
                </Button>
              </ButtonGroup>
            </div>
          )}

          {/* Switch View: Enable Portal Access Switch */}
          {isCustomer && portalViewMode === "switch" && (
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

          {/* Credentials section: shown if staff, or inline customer, or switch customer with portal enabled */}
          {(!isCustomer || portalViewMode === "inline" || portalAccessEnabled) && (
            <div className="flex flex-col gap-4">
              {/* Username */}
              <Field>
                <FieldLabel htmlFor="user-username">
                  <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
                  Username {isCustomer && <span className="text-muted-foreground">(Optional)</span>}
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
                  {isCustomer
                    ? "Optional lowercase portal handle."
                    : "Unique lowercase login handle."}
                </FieldDescription>
              </Field>

              {/* Password */}
              <Field>
                <FieldLabel htmlFor="user-password">
                  <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
                  {isEdit
                    ? "New Password (Optional)"
                    : isCustomer
                      ? "Password (Required if username set)"
                      : "Password"}
                </FieldLabel>
                <PasswordInput
                  id="user-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isEdit
                      ? "Leave blank to keep current password"
                      : isCustomer
                        ? "At least 6 characters if portal access enabled"
                        : "At least 6 characters"
                  }
                  className="h-8 text-xs"
                  autoComplete="new-password"
                />
                <FieldDescription>
                  {isEdit
                    ? "Leave blank to keep current password."
                    : isCustomer
                      ? "Minimum 6 characters for portal access."
                      : "Minimum 6 characters."}
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
              <Select
                items={ROLE_OPTIONS}
                value={role}
                onValueChange={(val) => {
                  if (val) setRole(val as UserRole);
                }}
              >
                <SelectTrigger id="user-role" className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={opt.icon}
                            className="size-3.5 text-muted-foreground"
                          />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Permission tier for system access.</FieldDescription>
            </Field>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between w-full gap-2 pt-2">
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
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
