"use client";

import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { LearnerCardImage } from "@/components/themed-page-builder";
import { cn } from "@/lib/utils";
import { useSchoolBrand, useSchoolThemeStyle } from "@/lib/school-theme-context";

export function LearnerSchoolLogo({ className }: { className?: string }) {
  const { logoUrl, logoAlt } = useSchoolBrand();
  const theme = useSchoolThemeStyle();
  const radius = theme.interactives?.card?.border?.radius ?? "rounded-md";
  const wrapperClassName = cn("block overflow-hidden", className, radius);

  if (logoUrl) {
    return (
      <span className={wrapperClassName}>
        <LearnerCardImage
          src={logoUrl}
          alt={logoAlt || "School logo"}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={wrapperClassName}>
      <CourseLitLogo className="size-full" />
    </span>
  );
}
