"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center w-full">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-8", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-1 text-muted-foreground hover:text-foreground"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <HugeiconsIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} className="size-3.5" />
      </Button>
    </div>
  );
}
