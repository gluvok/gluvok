"use client";

import { useEffect, useState } from "react";
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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon,
  Key01Icon,
  SecurityCheckIcon,
  TextFontIcon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { createUserSchema, updateUserSchema, type User, type UserRole } from "./types";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "operator", label: "Operator" },
  { value: "base", label: "Base User" },
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever dialog opens or targeted user changes
  useEffect(() => {
    if (open) {
      if (user) {
        setUsername(user.username);
        setName(user.name);
        setRole(user.role === "hardware" ? "operator" : user.role);
        setPassword("");
      } else {
        setUsername("");
        setName("");
        setRole(fixedRole ?? "operator");
        setPassword("");
      }
      setFormError(null);
    }
  }, [open, user, fixedRole]);

  const handleSubmit = async () => {
    setFormError(null);

    const payload = isEdit
      ? {
          id: user!.id,
          username: username.toLowerCase().trim(),
          name: name.trim(),
          role,
          password: password ? password.trim() : "",
        }
      : {
          username: username.toLowerCase().trim(),
          name: name.trim(),
          role,
          password: password.trim(),
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
          description: `Account "${payload.username}" has been successfully updated.`,
        });
      } else {
        await axios.post("/api/users", payload);
        toast.add({
          type: "success",
          title: `${entityLabel} created`,
          description: `Account "${payload.username}" has been created successfully.`,
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
                ? "Modify system credentials, operational role, or assign a new password."
                : "Provision a new system user profile assigned to the primary facility."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {formError && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              {formError}
            </div>
          )}

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
              Unique login handle (lowercase letters, numbers, hyphens, and underscores).
            </FieldDescription>
          </Field>

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
                ? "Official customer or enterprise name displayed on receipts and delivery entries."
                : "Official person name displayed in ticket logs and weighment audit trails."}
            </FieldDescription>
          </Field>

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
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Permission tier defining access to facility operations and system configurations.
              </FieldDescription>
            </Field>
          )}

          {/* Password */}
          <Field>
            <FieldLabel htmlFor="user-password">
              <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
              {isEdit ? "New Password (Optional)" : "Password"}
            </FieldLabel>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isEdit ? "Leave blank to keep current password" : "At least 6 characters"
              }
              className="h-8 text-xs"
              autoComplete="new-password"
            />
            <FieldDescription>
              {isEdit
                ? "Enter at least 6 characters to reset and re-hash credentials, or leave blank."
                : "Secure account access password (minimum 6 characters, hashed via Argon2id)."}
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !username.trim() || !name.trim()}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
