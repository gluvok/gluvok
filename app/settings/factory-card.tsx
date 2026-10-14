"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Factory01Icon,
  FloppyDiskIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { FormDirtyIndicator } from "@/components/form-dirty-indicator";
import { LoadingState } from "@/components/loading-state";
import {
  type Factory,
  type FactoryApiResponse,
  factoryFormSchema,
  type FactoryFormInput,
} from "./types";
import { FactoryForm } from "./factory-form";

function getFactoryFormValues(f: Factory): FactoryFormInput {
  return {
    name: f.name,
    receipt_images_per_row: f.receipt_images_per_row,
  };
}

export function FactoryCard() {
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
      setError(getErrorMessage(err, "Failed to load factory."));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchFactory();
  }, [fetchFactory]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const onSubmit = async (values: FactoryFormInput) => {
    try {
      const response = await axios.patch<FactoryApiResponse>("/api/factories", values);
      const updated = response.data.data;
      setFactory(updated);
      reset(getFactoryFormValues(updated));

      toast.add({
        type: "success",
        title: "Settings saved",
        description: "Factory configuration has been updated successfully.",
      });
    } catch (err: unknown) {
      toast.add({
        type: "error",
        title: "Save failed",
        description: getErrorMessage(err, "Failed to update factory."),
      });
    }
  };

  if (loading) {
    return <LoadingState message="Loading factory preferences..." className="h-72 w-full" />;
  }

  if (error || !factory) {
    return (
      <Card className="w-full border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
            <CardTitle>Failed to Load Factory</CardTitle>
          </div>
          <CardDescription>{error || "Factory could not be found."}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchFactory}
            className="gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" data-icon="inline-start" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={Factory01Icon} className="size-5" />
          </div>
          <div>
            <CardTitle>Factory Configuration</CardTitle>
            <CardDescription>
              Manage facility identity, scale snapshot layout, and system preferences.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <FactoryForm
          factory={factory}
          name={name}
          onNameChange={(val) => setValue("name", val, { shouldValidate: true, shouldDirty: true })}
          nameError={errors.name?.message}
          receiptImagesPerRow={receiptImagesPerRow}
          onReceiptImagesPerRowChange={(val) =>
            setValue("receipt_images_per_row", val, { shouldValidate: true, shouldDirty: true })
          }
          receiptImagesError={errors.receipt_images_per_row?.message}
        />
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between gap-3 pt-4">
        <FormDirtyIndicator isDirty={isDirty} />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty || isSubmitting}
            onClick={handleReset}
            className="h-8 gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" data-icon="inline-start" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSubmitting || !isValid}
            onClick={handleSubmit(onSubmit)}
            className="h-8 gap-1.5 text-xs"
          >
            {isSubmitting ? (
              <Spinner className="size-3.5" data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={FloppyDiskIcon} className="size-3.5" data-icon="inline-start" />
            )}
            Save Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
