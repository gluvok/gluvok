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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Calendar01Icon,
  Clock01Icon,
  Factory01Icon,
  FloppyDiskIcon,
  HashtagIcon,
  Image01Icon,
  RefreshIcon,
  TextFontIcon,
  ToggleOnIcon,
} from "@hugeicons/core-free-icons";
import { type Factory, type FactoryApiResponse, updateFactorySchema } from "./types";

const RECEIPT_IMAGE_OPTIONS = [
  { value: 1, label: "1 per row" },
  { value: 2, label: "2 per row" },
  { value: 3, label: "3 per row (Default)" },
  { value: 4, label: "4 per row" },
  { value: 5, label: "5 per row" },
  { value: 6, label: "6 per row" },
];

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function FactoryCard() {
  const [factory, setFactory] = useState<Factory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [checkCenterOnMerge, setCheckCenterOnMerge] = useState<boolean>(true);
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
      setCheckCenterOnMerge(data.check_center_on_merge);
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
    return (
      name !== factory.name ||
      checkCenterOnMerge !== factory.check_center_on_merge ||
      receiptImagesPerRow !== factory.receipt_images_per_row
    );
  }, [factory, name, checkCenterOnMerge, receiptImagesPerRow]);

  const handleReset = useCallback(() => {
    if (!factory) return;
    setName(factory.name);
    setCheckCenterOnMerge(factory.check_center_on_merge);
    setReceiptImagesPerRow(factory.receipt_images_per_row);
  }, [factory]);

  const handleSave = useCallback(async () => {
    const payload = {
      name: name.trim(),
      check_center_on_merge: checkCenterOnMerge,
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
      setCheckCenterOnMerge(updated.check_center_on_merge);
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
  }, [name, checkCenterOnMerge, receiptImagesPerRow]);

  if (loading) {
    return (
      <div className="flex h-72 w-full max-w-2xl items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Spinner className="size-6 text-muted-foreground" />
          <span className="text-xs">Loading factory preferences...</span>
        </div>
      </div>
    );
  }

  if (error || !factory) {
    return (
      <Card className="w-full max-w-2xl border-destructive/30">
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
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Factory01Icon} className="size-5 text-primary" />
            <div>
              <CardTitle>Factory Configuration</CardTitle>
              <CardDescription>
                Manage facility defaults, merging constraints, and receipt generation.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 gap-1 font-mono text-2xs">
            <HugeiconsIcon icon={HashtagIcon} className="size-3 text-muted-foreground" />
            ID: {factory.id}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <FieldGroup>
          {/* Factory Name */}
          <Field>
            <FieldLabel htmlFor="factory-name">
              <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
              Factory Name
            </FieldLabel>
            <Input
              id="factory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter factory name..."
              className="h-8 max-w-md text-xs"
            />
            <FieldDescription>
              The primary organizational name assigned to this processing facility.
            </FieldDescription>
          </Field>

          {/* Check Center On Merge */}
          <Field orientation="horizontal" className="items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="check-center-merge"
              checked={checkCenterOnMerge}
              onCheckedChange={(checked) => setCheckCenterOnMerge(Boolean(checked))}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-1">
              <FieldLabel
                htmlFor="check-center-merge"
                className="cursor-pointer text-xs font-medium"
              >
                <HugeiconsIcon icon={ToggleOnIcon} className="size-3.5 text-muted-foreground" />
                Check Center on Merge
              </FieldLabel>
              <FieldDescription>
                Enforce center matching when combining inbound and outbound weighment records.
              </FieldDescription>
            </div>
          </Field>

          {/* Receipt Images Per Row */}
          <Field>
            <FieldLabel htmlFor="receipt-images">
              <HugeiconsIcon icon={Image01Icon} className="size-3.5 text-muted-foreground" />
              Receipt Images per Row
            </FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                items={RECEIPT_IMAGE_OPTIONS}
                value={receiptImagesPerRow}
                onValueChange={(val) => {
                  if (val) setReceiptImagesPerRow(Number(val));
                }}
              >
                <SelectTrigger id="receipt-images" className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="min-w-44">
                  <SelectGroup>
                    {RECEIPT_IMAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <span className="text-2xs text-muted-foreground">
                (Snapshots per row on printed weighment slips)
              </span>
            </div>
          </Field>

          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-2xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Calendar01Icon} className="size-3 text-muted-foreground" />
              <span>Created:</span>
              <span className="font-medium text-foreground">{formatDate(factory.created_at)}</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock01Icon} className="size-3 text-muted-foreground" />
              <span>Updated:</span>
              <span className="font-medium text-foreground">{formatDate(factory.updated_at)}</span>
            </div>
          </div>
        </FieldGroup>
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between gap-3 pt-4">
        <p className="text-2xs text-muted-foreground">
          {isDirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleReset}
            className="gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" data-icon="inline-start" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving || !name.trim()}
            onClick={handleSave}
            className="gap-1.5 text-xs"
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
