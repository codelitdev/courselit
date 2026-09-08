import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[var(--radius)] border border-input bg-card px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--primary-soft)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--destructive-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
