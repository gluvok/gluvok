import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

import logoSquare from "@/public/logo.png";
import logoHorizontal from "@/public/logo-horizontal.png";
import logoVertical from "@/public/logo-vertical.png";

export interface LogoProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Image>,
  "src" | "alt"
> {
  size?: number;
}

export interface LogoHorizontalProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Image>,
  "src" | "alt"
> {
  size?: number;
}

export interface LogoVerticalProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Image>,
  "src" | "alt"
> {
  size?: number;
}

function getDimensions(imageAsset: string | StaticImageData, targetWidth: number) {
  if (typeof imageAsset === "object" && imageAsset && imageAsset.width && imageAsset.height) {
    const calculatedHeight = Math.round((targetWidth * imageAsset.height) / imageAsset.width);
    return {
      width: targetWidth,
      height: calculatedHeight,
      aspectRatio: `${imageAsset.width} / ${imageAsset.height}`,
    };
  }
  return {
    width: targetWidth,
    height: targetWidth,
    aspectRatio: "1 / 1",
  };
}

/**
 * Square / icon-only logo — uses static import of /logo.png
 */
export function Logo({ size = 32, className, priority = true, style, ...props }: LogoProps) {
  const dims = getDimensions(logoSquare, size);

  return (
    <Image
      src={logoSquare}
      alt="Gluvok logo"
      width={dims.width}
      height={dims.height}
      priority={priority}
      style={{ aspectRatio: dims.aspectRatio, ...style }}
      className={cn("h-auto w-auto object-contain", className)}
      {...props}
    />
  );
}

/**
 * Horizontal logo (wide) — uses static import of /logo-horizontal.png
 */
export function LogoHorizontal({
  size = 64,
  className,
  priority = true,
  style,
  ...props
}: LogoHorizontalProps) {
  const dims = getDimensions(logoHorizontal, size);

  return (
    <Image
      src={logoHorizontal}
      alt="Gluvok logo"
      width={dims.width}
      height={dims.height}
      priority={priority}
      style={{ aspectRatio: dims.aspectRatio, ...style }}
      className={cn("h-auto w-auto object-contain", className)}
      {...props}
    />
  );
}

/**
 * Vertical logo (stacked) — uses static import of /logo-vertical.png
 */
export function LogoVertical({
  size = 64,
  className,
  priority = true,
  style,
  ...props
}: LogoVerticalProps) {
  const dims = getDimensions(logoVertical, size);

  return (
    <Image
      src={logoVertical}
      alt="Gluvok logo"
      width={dims.width}
      height={dims.height}
      priority={priority}
      style={{ aspectRatio: dims.aspectRatio, ...style }}
      className={cn("h-auto w-auto object-contain", className)}
      {...props}
    />
  );
}
