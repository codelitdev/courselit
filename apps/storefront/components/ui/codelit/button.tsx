import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] border border-transparent text-sm font-semibold outline-none transition-[background-color,border-color,color] focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-border",
        outline: "border-input text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        soft: "bg-[var(--primary-soft)] text-primary hover:bg-[color-mix(in_oklch,var(--primary-soft),var(--primary)_10%)]",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-95",
      },
      size: {
        sm: "h-[30px] px-3 text-[0.8125rem]",
        md: "h-9 px-4",
        lg: "h-[42px] px-5 text-[0.9375rem]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
