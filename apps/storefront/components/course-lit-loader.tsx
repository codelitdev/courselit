"use client";

import { Loader } from "@codelitdev/design-system";
import { cn } from "@/lib/utils";

type CourseLitLoadingProps = {
  label?: string;
  className?: string;
  size?: number;
};

/** Icon-only CourseLit loading state for storefront surfaces. */
export function CourseLitLoading({
  label = "Loading",
  className,
  size = 48,
}: CourseLitLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <CourseLitLoadingIcon size={size} />
    </div>
  );
}

export function CourseLitLoadingIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 text-primary" aria-hidden="true">
      <Loader product="courselit" size={size} />
    </span>
  );
}
