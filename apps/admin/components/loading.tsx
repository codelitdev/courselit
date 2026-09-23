import { Loader } from "@codelitdev/design-system";
import { cn } from "@/lib/utils";

type LoadingProps = {
  label?: string;
  className?: string;
  size?: number;
};

/** The standard icon-only CourseLit loading state used by the admin application. */
export function CourseLitLoading({
  label = "Loading",
  className,
  size = 48,
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", className)}
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
