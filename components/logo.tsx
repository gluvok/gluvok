import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface LogoProps extends Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> {
  size?: number
}

export interface LogoHorizontalProps extends Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> {
  size?: number
}

export interface LogoVerticalProps extends Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> {
  size?: number
}

/**
 * Square / icon-only logo — uses /logo.png
 */
export function Logo({ size = 32, className, onLoad, ...props }: LogoProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)

  return (
    <Image
      src="/logo.png"
      alt="Gluvok logo"
      width={size}
      height={size}
      className={cn("object-contain w-auto h-auto", !isLoaded && "hidden", className)}
      onLoad={(e) => {
        setIsLoaded(true)
        onLoad?.(e)
      }}
      {...props}
    />
  )
}

/**
 * Horizontal logo (wide) — uses /logo-horizontal.png
 */
export function LogoHorizontal({ size = 64, className, onLoad, ...props }: LogoHorizontalProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)

  return (
    <Image
      src="/logo-horizontal.png"
      alt="Gluvok logo"
      width={size}
      height={0}
      className={cn("object-contain w-auto h-auto", !isLoaded && "hidden", className)}
      onLoad={(e) => {
        setIsLoaded(true)
        onLoad?.(e)
      }}
      {...props}
      loading="eager"
    />
  )
}

/**
 * Vertical logo (stacked) — uses /logo-vertical.png
 */
export function LogoVertical({ size = 64, className, onLoad, ...props }: LogoVerticalProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)

  return (
    <Image
      src="/logo-vertical.png"
      alt="Gluvok logo"
      width={size}
      height={0}
      className={cn("object-contain w-auto h-auto", !isLoaded && "hidden", className)}
      onLoad={(e) => {
        setIsLoaded(true)
        onLoad?.(e)
      }}
      {...props}
      loading="eager"
    />
  );
}
