"use client";

/**
 * @file components/form/image/preview-carousel.tsx
 * @description Image carousel rendering uploaded previews, displaying metadata, and handling image removals.
 */

import { useState } from "react";
import Image from "next/image";
import { X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getDisplayName, splitFileName } from "@/lib/utils";
import { DeleteEntityDialog } from "@/components/projects/dialog/delete";

interface ImagePreviewCarouselProps {
  images: string[];
  fileNames?: string[];
  disabled?: boolean;
  onRemove: (index: number) => void;
}

/**
 * ImagePreviewCarousel Component
 * Displays a list of image previews with dynamic delete confirmation dialogs and pagination arrows.
 */
export function ImagePreviewCarousel({
  images,
  fileNames,
  disabled,
  onRemove,
}: ImagePreviewCarouselProps) {
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  if (!images || images.length === 0) return null;
  return (
    <div className="flex justify-center w-full px-2 sm:px-4 overflow-hidden">
      <Carousel
        opts={{ align: "start" }}
        className="w-full relative px-8 sm:px-10 max-w-[220px] sm:max-w-[260px]"
      >
        <CarouselContent>
          {images.map((src, index) => {
            const imageSrc =
              src.startsWith("data:") ||
              src.startsWith("blob:") ||
              src.startsWith("/") ||
              src.startsWith("http")
                ? src
                : `/${src}`;
            const displayName = getDisplayName(src, fileNames?.[index], index);
            return (
              <CarouselItem
                key={index}
                className="basis-full min-w-0 flex flex-col items-center justify-center"
              >
                <div className="p-1 w-full">
                  {/* Image container — fixed aspect ratio keeps fill from overflowing */}
                  <div className="relative aspect-[4/3] w-full rounded-xl border border-muted-foreground/15 bg-card overflow-hidden shadow-sm group">
                    <Image
                      src={imageSrc}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-300"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <span className="text-2xs font-mono bg-background/80 text-foreground px-1.5 py-0.5 rounded shadow-xs border">
                        {index + 1} / {images.length}
                      </span>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full shadow-md active:scale-95 transition-transform"
                          onClick={() => setImageToDelete(index)}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filename label */}
                  <div
                    title={displayName}
                    className="mt-1.5 flex justify-center text-2xs font-mono text-muted-foreground w-full px-1 overflow-hidden whitespace-nowrap"
                  >
                    <span className="truncate">{splitFileName(displayName)[0]}</span>
                    <span className="shrink-0">{splitFileName(displayName)[1]}</span>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious
              type="button"
              className="left-0 h-8 w-8 rounded-full border bg-background/80 shadow hover:bg-background active:scale-95 transition-transform"
            />
            <CarouselNext
              type="button"
              className="right-0 h-8 w-8 rounded-full border bg-background/80 shadow hover:bg-background active:scale-95 transition-transform"
            />
          </>
        )}
      </Carousel>

      {imageToDelete !== null && (
        <DeleteEntityDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setImageToDelete(null);
          }}
          size="sm"
          projectName="Image"
          customDisplayName={
            fileNames?.[imageToDelete] ||
            getDisplayName(images[imageToDelete], undefined, imageToDelete)
          }
          onConfirm={() => {
            onRemove(imageToDelete);
            setImageToDelete(null);
          }}
        />
      )}
    </div>
  );
}
