import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

// CodeLit switch — mirrors `.cl-switch`. 36×21 track that turns the product
// accent when on, with a raised card-colored thumb.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[21px] w-9 shrink-0 items-center rounded-full bg-input p-[2.5px] outline-none transition-colors focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-card shadow-[0_1px_3px_oklch(0.3_0.02_60/0.3)] transition-transform data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
