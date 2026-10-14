"use client";

import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Clock01Icon,
  Grid2x2Icon,
  Grid3x2Icon,
  Image01Icon,
  ImagesIcon,
  Layout05Icon,
  LayoutThreeColumnIcon,
  LayoutTwoColumnIcon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";
import { ChevronsUpDownIcon } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { type Factory } from "./types";

const RECEIPT_IMAGE_OPTIONS = [
  { value: "1", label: "1 per row", icon: Image01Icon },
  { value: "2", label: "2 per row", icon: LayoutTwoColumnIcon },
  { value: "3", label: "3 per row (Default)", icon: LayoutThreeColumnIcon },
  { value: "4", label: "4 per row", icon: Grid2x2Icon },
  { value: "5", label: "5 per row", icon: Layout05Icon },
  { value: "6", label: "6 per row", icon: Grid3x2Icon },
];

interface FactoryFormProps {
  factory: Factory;
  name: string;
  onNameChange: (name: string) => void;
  nameError?: string;
  receiptImagesPerRow: number;
  onReceiptImagesPerRowChange: (val: number) => void;
  receiptImagesError?: string;
}

export function FactoryForm({
  factory,
  name,
  onNameChange,
  nameError,
  receiptImagesPerRow,
  onReceiptImagesPerRowChange,
  receiptImagesError,
}: FactoryFormProps) {
  const selectedOption = RECEIPT_IMAGE_OPTIONS.find(
    (opt) => opt.value === String(receiptImagesPerRow),
  );
  const selectedLabel = selectedOption?.label ?? `${receiptImagesPerRow} per row`;
  const SelectedIcon = selectedOption?.icon ?? Image01Icon;

  return (
    <div className="flex flex-col gap-6">
      {/* 2-Column Responsive Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Factory Name */}
        <Field data-invalid={Boolean(nameError)}>
          <FieldLabel htmlFor="factory-name">
            <HugeiconsIcon icon={TextFontIcon} className="size-3.5 text-muted-foreground" />
            <span>
              Factory Name{" "}
              <span className="text-destructive font-semibold" aria-hidden="true">
                *
              </span>
            </span>
          </FieldLabel>
          <Input
            id="factory-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter factory name..."
            aria-invalid={Boolean(nameError)}
            className="h-8 w-full text-xs"
          />
          {nameError && <FieldError errors={[{ message: nameError }]} />}
          <FieldDescription>Primary processing facility title.</FieldDescription>
        </Field>

        {/* Column 2: Receipt Images Per Row */}
        <Field data-invalid={Boolean(receiptImagesError)}>
          <FieldLabel htmlFor="receipt-images">
            <HugeiconsIcon icon={ImagesIcon} className="size-3.5 text-muted-foreground" />
            <span>
              Receipt Images per Row{" "}
              <span className="text-destructive font-semibold" aria-hidden="true">
                *
              </span>
            </span>
          </FieldLabel>
          <Combobox
            data={RECEIPT_IMAGE_OPTIONS}
            type="receipt images"
            value={String(receiptImagesPerRow)}
            onValueChange={(val) => {
              if (val) onReceiptImagesPerRowChange(Number(val));
            }}
          >
            <ComboboxTrigger
              id="receipt-images"
              className="h-8 w-full justify-between border-input bg-input/20 px-2.5 text-xs font-normal hover:bg-accent/50 dark:bg-input/30"
            >
              <span className="flex items-center gap-1.5 truncate">
                <HugeiconsIcon
                  icon={SelectedIcon}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{selectedLabel}</span>
              </span>
              <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </ComboboxTrigger>
            <ComboboxContent
              className="min-w-56"
              popoverOptions={{
                align: "start",
                sideOffset: 4,
              }}
            >
              <ComboboxInput placeholder="Search options..." className="h-8 text-xs" />
              <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">
                No option found.
              </ComboboxEmpty>
              <ComboboxList>
                <ComboboxGroup>
                  {RECEIPT_IMAGE_OPTIONS.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt.value} className="text-xs">
                      <HugeiconsIcon
                        icon={opt.icon}
                        className="mr-1.5 size-3.5 text-muted-foreground"
                      />
                      <span>{opt.label}</span>
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {receiptImagesError && <FieldError errors={[{ message: receiptImagesError }]} />}
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
            <span className="font-medium text-foreground">
              {formatDateTime(factory.created_at)}
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
              {formatDateTime(factory.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
