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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FloppyDiskIcon,
  Key01Icon,
  TextFontIcon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { createCustomerSchema, updateCustomerSchema, type Customer } from "./types";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer);

  const [username, setUsername] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [fatherName, setFatherName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever dialog opens or targeted customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        setUsername(customer.username);
        setName(customer.name);
        setFatherName(customer.father_name || "");
        setPassword("");
      } else {
        setUsername("");
        setName("");
        setFatherName("");
        setPassword("");
      }
      setFormError(null);
    }
  }, [open, customer]);

  const handleSubmit = async () => {
    setFormError(null);

    const payload = isEdit
      ? {
          id: customer!.id,
          username: username.toLowerCase().trim(),
          name: name.trim(),
          father_name: fatherName.trim(),
          role: "customer" as const,
          password: password ? password.trim() : "",
        }
      : {
          username: username.toLowerCase().trim(),
          name: name.trim(),
          father_name: fatherName.trim(),
          role: "customer" as const,
          password: password.trim(),
        };

    const validation = isEdit
      ? updateCustomerSchema.safeParse(payload)
      : createCustomerSchema.safeParse(payload);

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
          description: `Customer "${payload.name}" (@${payload.username}) has been updated.`,
        });
      } else {
        await axios.post("/api/users", payload);
        toast.add({
          type: "success",
          title: "Customer created",
          description: `Customer "${payload.name}" (@${payload.username}) has been created successfully.`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={isEdit ? UserEdit01Icon : UserAdd01Icon} className="size-4" />
            </div>
            <DialogTitle>{isEdit ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </div>
          <DialogDescription>
            {isEdit
              ? "Modify customer details, father's name, or update access credentials."
              : "Provision a new customer account for portal access and weighment tracking."}
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
            <FieldLabel htmlFor="customer-name">
              <HugeiconsIcon icon={UserIcon} className="size-3.5 text-muted-foreground" />
              Full Name
            </FieldLabel>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="h-8 text-xs"
            />
            <FieldDescription>
              Official customer name displayed on receipts and weighment slips.
            </FieldDescription>
          </Field>

          {/* Father's Name */}
          <Field>
            <FieldLabel htmlFor="customer-father-name">
              <HugeiconsIcon icon={UserGroupIcon} className="size-3.5 text-muted-foreground" />
              Father&apos;s Name
            </FieldLabel>
            <Input
              id="customer-father-name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="e.g. Suresh Kumar"
              className="h-8 text-xs"
            />
            <FieldDescription>
              Secondary identification used for agricultural account matching.
            </FieldDescription>
          </Field>

          {/* Username */}
          <Field>
            <FieldLabel htmlFor="customer-username">
              <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
              Username
            </FieldLabel>
            <Input
              id="customer-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. ramesh_k"
              className="h-8 text-xs font-mono"
              autoComplete="off"
            />
            <FieldDescription>
              Unique login handle (lowercase letters, numbers, hyphens, and underscores).
            </FieldDescription>
          </Field>

          {/* Password */}
          <Field>
            <FieldLabel htmlFor="customer-password">
              <HugeiconsIcon icon={Key01Icon} className="size-3.5 text-muted-foreground" />
              {isEdit ? "New Password (Optional)" : "Password"}
            </FieldLabel>
            <Input
              id="customer-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isEdit ? "Leave blank to keep current password" : "At least 6 characters"
              }
              className="h-8 text-xs font-mono"
              autoComplete={isEdit ? "new-password" : "off"}
            />
            <FieldDescription>
              {isEdit
                ? "Enter only if updating the customer's portal login password."
                : "Initial portal credential for the customer."}
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            disabled={isSubmitting}
            className="h-8 gap-1.5 text-xs"
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-3.5" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={FloppyDiskIcon}
                  className="size-3.5"
                  data-icon="inline-start"
                />
                <span>{isEdit ? "Save Changes" : "Create Customer"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
