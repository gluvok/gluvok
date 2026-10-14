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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { type Customer } from "./types";

interface CustomerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSuccess: () => void;
}

export function CustomerDeleteDialog({
  open,
  onOpenChange,
  customers,
  onSuccess,
}: CustomerDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isBatch = customers.length > 1;

  useEffect(() => {
    if (open) {
      setDeleteError(null);
    }
  }, [open]);

  const handleDelete = async () => {
    if (customers.length === 0) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const payload = isBatch ? { ids: customers.map((c) => c.id) } : { id: customers[0].id };

      await axios.delete("/api/users", { data: payload });

      toast.add({
        type: "success",
        title: isBatch ? "Customers deleted" : "Customer deleted",
        description: isBatch
          ? `Successfully deleted ${customers.length} customer accounts.`
          : `Customer "${customers[0].name}" has been removed.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : err instanceof Error
            ? err.message
            : "Failed to delete customer.";

      setDeleteError(msg);
      toast.add({
        type: "error",
        title: "Deletion blocked",
        description: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </div>
            <DialogTitle>
              {isBatch ? `Delete ${customers.length} Customers` : "Delete Customer"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isBatch
              ? `Are you sure you want to delete these ${customers.length} customer accounts? Customers with linked entries cannot be deleted.`
              : customers[0]
                ? `Are you sure you want to delete "${customers[0].name}" (@${customers[0].username})? Customers with linked entries cannot be deleted.`
                : "Confirm customer deletion."}
          </DialogDescription>
        </DialogHeader>

        {deleteError ? (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Deletion Safeguard Active</span>
              <span className="text-2xs/relaxed">{deleteError}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {isBatch ? (
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-foreground">Targeted customers:</span>
                <div className="flex flex-wrap gap-1">
                  {customers.slice(0, 5).map((c) => (
                    <span
                      key={c.id}
                      className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground"
                    >
                      {c.name}
                    </span>
                  ))}
                  {customers.length > 5 && (
                    <span className="text-2xs text-muted-foreground">
                      +{customers.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span>
                This action performs a soft-deletion, preserving historical data integrity.
              </span>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 gap-1.5 text-xs"
          >
            {isDeleting ? (
              <>
                <Spinner className="size-3.5" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" data-icon="inline-start" />
                <span>{isBatch ? `Delete ${customers.length} Customers` : "Delete Customer"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
