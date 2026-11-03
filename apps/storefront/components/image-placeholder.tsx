"use client";

import { ImageIcon } from "lucide-react";
import { LearnerCaption, LearnerCard } from "@/components/themed-page-builder";
import { cn } from "@/lib/utils";

/** Neutral stand-in for a missing cover image. Built from page primitives so
 * it follows the school's theme; it never shows any CourseLit artwork. */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <LearnerCard
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-none border-0 shadow-none",
        className,
      )}
    >
      <LearnerCaption>
        <ImageIcon className="size-8" aria-hidden="true" />
      </LearnerCaption>
    </LearnerCard>
  );
}
