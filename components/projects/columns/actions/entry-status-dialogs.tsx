/**
 * @file components/projects/columns/actions/entry-status-dialogs.tsx
 * @description Confirmation dialog modals for approving and rejecting entry records.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface EntryApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  vehicleNumber: string;
  loading: boolean;
  onConfirm: () => Promise<void>;
}

export function EntryApproveDialog({
  open,
  onOpenChange,
  itemId,
  vehicleNumber,
  loading,
  onConfirm,
}: EntryApproveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[92vw] sm:w-full max-w-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Approve Entry
          </DialogTitle>
          <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
            Are you sure you want to approve entry{" "}
            <span className="font-semibold text-foreground">ID: {itemId}</span>
            {vehicleNumber ? (
              <>
                {" "}
                (Vehicle: <span className="font-semibold text-foreground">{vehicleNumber}</span>)
              </>
            ) : null}
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
          <Button
            id={`approve-cancel-${itemId}`}
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="gap-1.5 h-8 px-3 text-xs"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button
            id={`approve-confirm-${itemId}`}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="gap-1.5 h-8 px-3 text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EntryRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  vehicleNumber: string;
  loading: boolean;
  onConfirm: () => Promise<void>;
}

export function EntryRejectDialog({
  open,
  onOpenChange,
  itemId,
  vehicleNumber,
  loading,
  onConfirm,
}: EntryRejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[92vw] sm:w-full max-w-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <div className="p-1.5 rounded-lg bg-rose-500/10">
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            Reject Entry
          </DialogTitle>
          <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
            Are you sure you want to reject entry{" "}
            <span className="font-semibold text-foreground">ID: {itemId}</span>
            {vehicleNumber ? (
              <>
                {" "}
                (Vehicle: <span className="font-semibold text-foreground">{vehicleNumber}</span>)
              </>
            ) : null}
            ? This entry will be locked and cannot be merged into weighments.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
          <Button
            id={`reject-cancel-${itemId}`}
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="gap-1.5 h-8 px-3 text-xs"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button
            id={`reject-confirm-${itemId}`}
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="gap-1.5 h-8 px-3 text-xs shadow-sm bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
