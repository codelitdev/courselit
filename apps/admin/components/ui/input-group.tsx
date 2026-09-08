"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Button } from "@/components/ui/codelit/button";
import { Textarea } from "@/components/ui/codelit/textarea";
import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex h-9 w-full min-w-0 items-center overflow-hidden rounded-[var(--radius)] border border-input bg-card transition-[border-color,box-shadow] outline-none",
        "has-[>textarea]:h-auto",
        "has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        "has-[>[data-align=inline-end]]:[&>input]:pr-1.5",
        "[&_[data-slot=input-group-control]]:min-h-0 [&_[data-slot=input-group-control]]:border-0 [&_[data-slot=input-group-control]]:bg-transparent [&_[data-slot=input-group-control]]:shadow-none [&_[data-slot=input-group-control]]:outline-none",
        "[&_[data-slot=input-group-control]:focus]:border-0 [&_[data-slot=input-group-control]:focus]:shadow-none [&_[data-slot=input-group-control]:focus]:outline-none",
        "[&_[data-slot=input-group-control]:focus-visible]:border-0 [&_[data-slot=input-group-control]:focus-visible]:shadow-none [&_[data-slot=input-group-control]:focus-visible]:outline-none",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_3px_var(--primary-soft)]",
        "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:shadow-[0_0_0_3px_var(--destructive-soft)]",
        "has-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3 has-[>button]:ml-[-0.3rem]",
        "inline-end": "order-last pr-3 has-[>button]:mr-[-0.3rem]",
        "block-start":
          "order-first w-full justify-start px-3 pt-2.5 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-3 pb-2.5 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-8 gap-1.5 px-2.5",
      "icon-xs": "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
      "icon-sm": "size-8 p-0 has-[>svg]:p-0",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        "h-full min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-sm text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none focus-visible:border-transparent focus-visible:shadow-none disabled:bg-transparent aria-invalid:border-0 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
