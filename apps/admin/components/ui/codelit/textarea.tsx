import type * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full resize-y rounded-[var(--radius)] border border-input bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--primary-soft)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--destructive-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
