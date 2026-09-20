"use client";

import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { LearnerCardImage } from "@/components/themed-page-builder";
import { useSchoolBrand } from "@/lib/school-theme-context";

export function LearnerSchoolLogo({ className }: { className?: string }) {
  const { logoUrl, logoAlt } = useSchoolBrand();

  if (logoUrl) {
    return (
      <LearnerCardImage
        src={logoUrl}
        alt={logoAlt || "School logo"}
        className={className}
      />
    );
  }

  return <CourseLitLogo className={className} />;
}
