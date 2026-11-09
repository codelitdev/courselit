import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A full-width notice at the top of a screen for something the admin needs to
 * act on before learners see their work, e.g. an unpublished product or a
 * community that is not launched. Ends with a link to where they fix it.
 */
export function StatusBanner({
  children,
  actionLabel,
  actionHref,
  className = "mb-5",
}: {
  children: ReactNode;
  actionLabel: string;
  actionHref: string;
  /** Spacing below the banner; screens that already space their children pass "". */
  className?: string;
}) {
  return (
    <div className={`${className} rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground`}>
      {children}{" "}
      <Link href={actionHref} className="underline">
        {actionLabel}
      </Link>
    </div>
  );
}
