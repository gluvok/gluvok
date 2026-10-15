"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { getErrorMessage } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Factory01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { FormDirtyIndicator } from "@/components/form-dirty-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Factory,
  type FactoryApiResponse,
  factoryFormSchema,
  type FactoryFormInput,
} from "@/app/settings/types";
import { FactoryForm } from "@/app/settings/factory-form";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SettingsDialogSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Skeleton className="h-3.5 w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function getFactoryFormValues(f: Factory): FactoryFormInput {
  return {
    name: f.name,
    receipt_images_per_row: f.receipt_images_per_row,
  };
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [factory, setFactory] = useState<Factory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<FactoryFormInput>({
    resolver: zodResolver(factoryFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      receipt_images_per_row: 3,
    },
  });

  const name = watch("name");
  const receiptImagesPerRow = watch("receipt_images_per_row");

  const fetchFactory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<FactoryApiResponse>("/api/factories");
      const data = response.data.data;
      setFactory(data);
      reset(getFactoryFormValues(data));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load factory preferences."));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    if (open) {
      fetchFactory();
    }
  }, [open, fetchFactory]);

  const onSubmit = async (values: FactoryFormInput) => {
    try {
      const response = await axios.patch<FactoryApiResponse>("/api/factories", values);
      const updated = response.data.data;
      setFactory(updated);
      reset(getFactoryFormValues(updated));

      toast.add({
        type: "success",
        title: "Settings Saved",
        description: "Factory configuration has been updated successfully.",
      });

      onOpenChange(false);
    } catch (err: unknown) {
      toast.add({
        type: "error",
        title: "Save Failed",
        description: getErrorMessage(err, "Failed to update factory settings."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={Factory01Icon} className="size-4" />
            </div>
            <DialogTitle>Factory Settings</DialogTitle>
          </div>
          <DialogDescription>Facility identity and ticket layout.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <SettingsDialogSkeleton />
        ) : error || !factory ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-4 shrink-0" />
              <span>{error || "Factory could not be found."}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchFactory}
              className="w-fit gap-1.5 text-xs"
            >
              <HugeiconsIcon icon={RefreshIcon} className="size-3.5" data-icon="inline-start" />
              Retry
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <p className="text-2xs text-muted-foreground">
              <span className="text-destructive font-semibold">*</span> indicates required field
            </p>

            <FactoryForm
              factory={factory}
              name={name}
              onNameChange={(val) =>
                setValue("name", val, { shouldValidate: true, shouldDirty: true })
              }
              nameError={errors.name?.message}
              receiptImagesPerRow={receiptImagesPerRow}
              onReceiptImagesPerRowChange={(val) =>
                setValue("receipt_images_per_row", val, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              receiptImagesError={errors.receipt_images_per_row?.message}
            />

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
                  disabled={!isDirty || isSubmitting || !isValid}
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
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
