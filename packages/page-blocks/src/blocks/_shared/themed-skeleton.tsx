"use client";

/**
 * The page-builder primitives do not currently expose a skeleton primitive.
 * Keep this small exception centralized and use the page-builder color token
 * so it follows the active light/dark theme.
 */
export function ThemedSkeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}
