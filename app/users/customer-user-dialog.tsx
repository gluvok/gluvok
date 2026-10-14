"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "@/components/ui/toast";
import { UserAdd01Icon, UserEdit01Icon } from "@hugeicons/core-free-icons";
import {
  CredentialsFields,
  CustomerPortalSwitch,
  FullNameField,
  UserDialogShell,
} from "./user-dialog-primitives";
import { createCustomerUserSchema, updateCustomerUserSchema, type User } from "./types";

interface CustomerUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

export function CustomerUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: CustomerUserDialogProps) {
  const isEdit = Boolean(user);

  const [name, setName] = useState<string>("");
  const [portalAccessEnabled, setPortalAccessEnabled] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Baseline snapshot for dirty checking
  const [initialValues, setInitialValues] = useState<{
    name: string;
    username: string;
    portalAccessEnabled: boolean;
  }>({
    name: "",
    username: "",
    portalAccessEnabled: false,
  });

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (user) {
        const hasPortal = Boolean(user.username);
        setName(user.name);
        setPortalAccessEnabled(hasPortal);
        setUsername(user.username ?? "");
        setPassword("");
        setInitialValues({
          name: user.name,
          username: user.username ?? "",
          portalAccessEnabled: hasPortal,
        });
      } else {
        setName("");
        setPortalAccessEnabled(false);
        setUsername("");
        setPassword("");
        setInitialValues({
          name: "",
          username: "",
          portalAccessEnabled: false,
        });
      }
    }
  }, [open, user]);

  const isDirty = useMemo(() => {
    if (password.length > 0) return true;
    if (name.trim() !== initialValues.name) return true;
    if (portalAccessEnabled !== initialValues.portalAccessEnabled) return true;
    if (username.trim().toLowerCase() !== initialValues.username) return true;
    return false;
  }, [password, name, portalAccessEnabled, username, initialValues]);

  const handleSubmit = async () => {
    setFormError(null);

    const effectiveUsername = portalAccessEnabled ? username.toLowerCase().trim() : "";
    const effectivePassword = portalAccessEnabled ? password.trim() : "";

    const payload = isEdit
      ? {
          id: user!.id,
          username: effectiveUsername,
          name: name.trim(),
          role: "customer" as const,
          password: effectivePassword,
        }
      : {
          username: effectiveUsername,
          name: name.trim(),
          role: "customer" as const,
          password: effectivePassword,
        };

    const validation = isEdit
      ? updateCustomerUserSchema.safeParse(payload)
      : createCustomerUserSchema.safeParse(payload);

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
          title: "Customer updated",
          description: payload.username
            ? `Account "${payload.username}" has been successfully updated.`
            : `Customer "${payload.name}" has been successfully updated.`,
        });
      } else {
        await axios.post("/api/users", payload);
        toast.add({
          type: "success",
          title: "Customer created",
          description: payload.username
            ? `Account "${payload.username}" has been created successfully.`
            : `Customer "${payload.name}" has been created successfully.`,
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
        title: isEdit ? "Failed to update customer" : "Failed to create customer",
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
      title={isEdit ? "Edit Customer" : "Add New Customer"}
      description={
        isEdit
          ? "Modify portal credentials or update account information."
          : "Register a new agricultural supplier or customer profile."
      }
      headerIcon={isEdit ? UserEdit01Icon : UserAdd01Icon}
      formError={formError}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* Row 1: Full Name (full-width) */}
      <FullNameField
        value={name}
        onChange={setName}
        placeholder="e.g. Ramesh Kumar"
        description="Customer or enterprise name on delivery tickets."
      />

      {/* Row 2: Customer Portal Access Toggle */}
      <CustomerPortalSwitch
        checked={portalAccessEnabled}
        onCheckedChange={(checked) => {
          setPortalAccessEnabled(checked);
          if (!checked) {
            setUsername("");
            setPassword("");
          }
        }}
      />

      {/* Row 3: Credentials (only rendered when portal access is enabled) */}
      {portalAccessEnabled && (
        <CredentialsFields
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          isEdit={isEdit}
          usernamePlaceholder="e.g. kisan_ramesh"
          usernameDescription="Lowercase portal login handle."
        />
      )}
    </UserDialogShell>
  );
}
