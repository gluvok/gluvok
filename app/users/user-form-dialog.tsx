"use client";

import { StaffUserDialog } from "./staff-user-dialog";
import { CustomerUserDialog } from "./customer-user-dialog";
import { type User, type UserRole } from "./types";

export { StaffUserDialog } from "./staff-user-dialog";
export { CustomerUserDialog } from "./customer-user-dialog";

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
  if (fixedRole === "customer" || user?.role === "customer") {
    return (
      <CustomerUserDialog
        open={open}
        onOpenChange={onOpenChange}
        user={user}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <StaffUserDialog open={open} onOpenChange={onOpenChange} user={user} onSuccess={onSuccess} />
  );
}
