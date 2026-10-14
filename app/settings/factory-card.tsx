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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
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
    return (
      <div className="flex h-72 w-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Spinner className="size-6 text-muted-foreground" />
          <span className="text-xs">Loading factory preferences...</span>
        </div>
      </div>
    );
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0 gap-1 font-mono text-2xs">
              <HugeiconsIcon icon={HashtagIcon} className="size-3 text-muted-foreground" />
              ID: {factory.id}
            </Badge>
            <Badge
              variant="secondary"
              className="shrink-0 text-2xs font-normal text-emerald-600 dark:text-emerald-400"
            >
              Active Facility
            </Badge>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <div className="flex flex-col gap-6">
          {/* 2-Column Responsive Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Factory Name */}
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
                className="h-8 w-full text-xs"
              />
              <FieldDescription>
                The primary organizational name assigned to this processing facility.
              </FieldDescription>
            </Field>

            {/* Column 2: Receipt Images Per Row */}
            <Field>
              <FieldLabel htmlFor="receipt-images">
                <HugeiconsIcon icon={Image01Icon} className="size-3.5 text-muted-foreground" />
                Receipt Images per Row
              </FieldLabel>
              <Select
                items={RECEIPT_IMAGE_OPTIONS}
                value={receiptImagesPerRow}
                onValueChange={(val) => {
                  if (val) setReceiptImagesPerRow(Number(val));
                }}
              >
                <SelectTrigger id="receipt-images" className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {RECEIPT_IMAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Number of vehicle snapshot photos embedded per row on printed scale tickets.
              </FieldDescription>
            </Field>
          </div>

          {/* Full-Width 3-Column Metadata Stat Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3.5 text-xs border border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-background border text-muted-foreground">
                <HugeiconsIcon icon={HashtagIcon} className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Facility Scope</span>
                <span className="font-medium text-foreground">Factory #{factory.id} (Primary)</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-background border text-muted-foreground">
                <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Created On</span>
                <span className="font-medium text-foreground">
                  {formatDate(factory.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-background border text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Last Modified</span>
                <span className="font-medium text-foreground">
                  {formatDate(factory.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
            )}
          />
          <span>{isDirty ? "You have unsaved changes." : "All changes saved."}</span>
        </div>
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
