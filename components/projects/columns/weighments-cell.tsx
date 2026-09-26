/**
 * @file components/projects/columns/weighments-cell.tsx
 * @description Column definitions and rendering helpers for the Weighments-cell entity table.
 */

"use client";

import * as React from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { getDisplayName, splitFileName } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

interface WeighmentImagesCellProps {
  images?: string[];
  vehicleNumber: string;
}

export function WeighmentImagesCell({ images = [], vehicleNumber }: WeighmentImagesCellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    const updateSlide = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };

    // Defer the initial read so setState is not called synchronously in the effect body
    const id = setTimeout(updateSlide, 0);

    api.on("select", updateSlide);
    api.on("reInit", updateSlide);

    return () => {
      clearTimeout(id);
      api.off("select", updateSlide);
      api.off("reInit", updateSlide);
    };
  }, [api, isOpen]);

  const hasImages = Boolean(images && images.length > 0);

  return (
    <>
      {hasImages ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center py-0.5 px-2 rounded-full border border-muted-foreground/15 bg-muted/60 hover:bg-muted/90 text-2xs font-mono font-semibold text-foreground transition-all duration-200 active:scale-[0.97] outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm cursor-pointer select-none"
          title="View images"
        >
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        </button>
      ) : (
        <div className="inline-flex items-center py-0.5 px-2 rounded-full border border-dashed border-muted-foreground/20 bg-muted/10 text-2xs font-mono font-medium text-muted-foreground/40 select-none cursor-default">
          <span>No images</span>
        </div>
      )}

      {hasImages && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-muted-foreground/15 shadow-2xl rounded-2xl gap-0">
            <DialogHeader className="p-5 pb-4 border-b border-muted-foreground/10 bg-muted/20">
              <DialogTitle className="flex items-center gap-2 text-foreground text-sm font-semibold">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>Weighment Photos</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Vehicle:{" "}
                <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-2xs">
                  {vehicleNumber}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 pb-2 flex flex-col items-center justify-center bg-black/5 dark:bg-black/20 w-full overflow-hidden">
              <Carousel setApi={setApi} className="w-full max-w-full relative px-10">
                <CarouselContent>
                  {images.map((img, i) => {
                    const src = img.startsWith("/") || img.startsWith("http") ? img : `/${img}`;
                    return (
                      <CarouselItem
                        key={i}
                        className="flex flex-col items-center justify-center min-w-0"
                      >
                        <div className="relative aspect-[4/3] w-full rounded-xl border border-muted-foreground/10 bg-card overflow-hidden shadow-md group">
                          <Image
                            src={src}
                            alt={`Weighment image ${i + 1}`}
                            fill
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-200"
                            priority={i === 0}
                            unoptimized
                          />
                        </div>
                        <div
                          title={getDisplayName(img, undefined, i)}
                          className="mt-2 flex justify-center text-2xs font-mono text-muted-foreground w-full px-2 overflow-hidden whitespace-nowrap"
                        >
                          <span className="truncate">
                            {splitFileName(getDisplayName(img, undefined, i))[0]}
                          </span>
                          <span className="shrink-0">
                            {splitFileName(getDisplayName(img, undefined, i))[1]}
                          </span>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-0 h-8 w-8 rounded-full border bg-background/80 shadow hover:bg-background active:scale-95 transition-transform" />
                    <CarouselNext className="right-0 h-8 w-8 rounded-full border bg-background/80 shadow hover:bg-background active:scale-95 transition-transform" />
                  </>
                )}
              </Carousel>
            </div>

            <div className="py-3 text-center text-xs font-mono font-medium text-muted-foreground border-t border-muted-foreground/5 bg-muted/10">
              Slide {current} of {count}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
