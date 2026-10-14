"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Clock01Icon, Image01Icon, TextFontIcon } from "@hugeicons/core-free-icons";
import { type Factory } from "./types";

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

interface FactoryFormProps {
  factory: Factory;
  name: string;
  onNameChange: (name: string) => void;
  receiptImagesPerRow: number;
  onReceiptImagesPerRowChange: (val: number) => void;
}

export function FactoryForm({
  factory,
  name,
  onNameChange,
  receiptImagesPerRow,
  onReceiptImagesPerRowChange,
}: FactoryFormProps) {
  return (
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
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter factory name..."
            className="h-8 w-full text-xs"
          />
          <FieldDescription>Primary processing facility title.</FieldDescription>
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
              if (val) onReceiptImagesPerRowChange(Number(val));
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
          <FieldDescription>Snapshot photos embedded per row on printed tickets.</FieldDescription>
        </Field>
      </div>

      {/* 2-Column Metadata Stat Strip (Created On & Last Modified) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3.5 text-xs border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-background border text-muted-foreground">
            <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xs text-muted-foreground">Created On</span>
            <span className="font-medium text-foreground">{formatDate(factory.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-background border text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xs text-muted-foreground">Last Modified</span>
            <span className="font-medium text-foreground">{formatDate(factory.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
