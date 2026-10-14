"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "@/components/ui/toast";
import { UserAdd01Icon, UserEdit01Icon } from "@hugeicons/core-free-icons";
import {
  CredentialsFields,
  FullNameField,
  SystemRoleSelect,
  UserDialogShell,
} from "./user-dialog-primitives";
import { createStaffUserSchema, updateStaffUserSchema, type StaffRole, type User } from "./types";

interface StaffUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

export function StaffUserDialog({ open, onOpenChange, user, onSuccess }: StaffUserDialogProps) {
  const isEdit = Boolean(user);

  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<StaffRole>("operator");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Baseline values snapshot for pristine/dirty check
  const [initialValues, setInitialValues] = useState<{
    name: string;
    role: StaffRole;
    username: string;
  }>({
    name: "",
    role: "operator",
    username: "",
  });

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (user) {
        const staffRole = (user.role as StaffRole) || "operator";
        setName(user.name);
        setRole(staffRole);
        setUsername(user.username ?? "");
        setPassword("");
        setInitialValues({
          name: user.name,
          role: staffRole,
          username: user.username ?? "",
        });
      } else {
        setName("");
        setRole("operator");
        setUsername("");
        setPassword("");
        setInitialValues({
          name: "",
          role: "operator",
          username: "",
        });
      }
    }
  }, [open, user]);

  const isDirty = useMemo(() => {
    if (password.length > 0) return true;
    if (name.trim() !== initialValues.name) return true;
    if (role !== initialValues.role) return true;
    if (username.trim().toLowerCase() !== initialValues.username) return true;
    return false;
  }, [password, name, role, username, initialValues]);

  const payload = useMemo(
    () =>
      isEdit && user
        ? {
            id: user.id,
            username: username.toLowerCase().trim(),
            name: name.trim(),
            role,
            password: password.trim(),
          }
        : {
            username: username.toLowerCase().trim(),
            name: name.trim(),
            role,
            password: password.trim(),
          },
    [isEdit, user, username, name, role, password],
  );

  const isValid = useMemo(() => {
    return isEdit
      ? updateStaffUserSchema.safeParse(payload).success
      : createStaffUserSchema.safeParse(payload).success;
  }, [isEdit, payload]);

  const handleSubmit = async () => {
    setFormError(null);

    const validation = isEdit
      ? updateStaffUserSchema.safeParse(payload)
      : createStaffUserSchema.safeParse(payload);

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
          title: "User updated",
          description: `Account "${payload.username}" has been successfully updated.`,
        });
      } else {
        await axios.post("/api/users", payload);
        toast.add({
          type: "success",
          title: "User created",
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
        title: isEdit ? "Failed to update user" : "Failed to create user",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Staff User" : "Add New Staff User"}
      description={
        isEdit
          ? "Modify account credentials and system role."
          : "Provision a new system operator or staff account."
      }
      headerIcon={isEdit ? UserEdit01Icon : UserAdd01Icon}
      formError={formError}
      isDirty={isDirty}
      isValid={isValid}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* Row 1: Full Name and System Role side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FullNameField
          value={name}
          onChange={setName}
          placeholder="e.g. Alex Morgan"
          description="Operator name displayed in audit trails."
        />
        <SystemRoleSelect value={role} onChange={setRole} />
      </div>

      {/* Row 2: Username and Password side-by-side */}
      <CredentialsFields
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        isEdit={isEdit}
        usernamePlaceholder="e.g. alex_operator"
        usernameDescription="Unique lowercase login handle."
      />
    </UserDialogShell>
  );
}
