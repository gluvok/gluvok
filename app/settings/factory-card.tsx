"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Factory01Icon,
  FloppyDiskIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { FormDirtyIndicator } from "@/components/form-dirty-indicator";
import { LoadingState } from "@/components/loading-state";
import { type Factory, type FactoryApiResponse, updateFactorySchema } from "./types";
import { FactoryForm } from "./factory-form";

export function FactoryCard() {
  const [factory, setFactory] = useState<Factory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [receiptImagesPerRow, setReceiptImagesPerRow] = useState<number>(3);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchFactory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<FactoryApiResponse>("/api/factories");
      const data = response.data.data;
      setFactory(data);
      setName(data.name);
      setReceiptImagesPerRow(data.receipt_images_per_row);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Failed to load factory";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactory();
  }, [fetchFactory]);

  const isDirty = useMemo(() => {
    if (!factory) return false;
    return name !== factory.name || receiptImagesPerRow !== factory.receipt_images_per_row;
  }, [factory, name, receiptImagesPerRow]);

  const handleReset = useCallback(() => {
    if (!factory) return;
    setName(factory.name);
    setReceiptImagesPerRow(factory.receipt_images_per_row);
  }, [factory]);

  const handleSave = useCallback(async () => {
    const payload = {
      name: name.trim(),
      receipt_images_per_row: receiptImagesPerRow,
    };

    const validation = updateFactorySchema.safeParse(payload);
    if (!validation.success) {
      toast.add({
        type: "error",
        title: "Validation error",
        description: validation.error.issues[0]?.message || "Invalid input",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await axios.patch<FactoryApiResponse>("/api/factories", payload);
      const updated = response.data.data;
      setFactory(updated);
      setName(updated.name);
      setReceiptImagesPerRow(updated.receipt_images_per_row);

      toast.add({
        type: "success",
        title: "Settings saved",
        description: "Factory configuration has been updated successfully.",
      });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Failed to update factory";

      toast.add({
        type: "error",
        title: "Save failed",
        description: msg,
      });
    } finally {
      setIsSaving(false);
    }
  }, [name, receiptImagesPerRow]);

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
          onNameChange={setName}
          receiptImagesPerRow={receiptImagesPerRow}
          onReceiptImagesPerRowChange={setReceiptImagesPerRow}
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
            disabled={!isDirty || isSaving}
            onClick={handleReset}
            className="h-8 gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" data-icon="inline-start" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving || !name.trim()}
            onClick={handleSave}
            className="h-8 gap-1.5 text-xs"
          >
            {isSaving ? (
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
