"use client";

import type { ThemeStyle } from "@frontlit/page-builder/models";
import { Toaster, toast } from "sonner";
import { useSchoolThemeMode, useSchoolThemeStyle } from "@/lib/school-theme-context";
import { cn } from "@/lib/utils";

function typographyClasses(style: ThemeStyle["typography"]["text2"]) {
  return [
    style.fontFamily,
    style.fontSize,
    style.fontWeight,
    style.lineHeight,
    style.letterSpacing,
    style.textTransform,
    style.textDecoration,
    style.textOverflow,
  ];
}

/**
 * Sonner provides behavior that is not currently available as a page-builder
 * primitive. Keep that exception centralized and derive its visual treatment
 * from the same school theme used by PageCard and the typography primitives.
 */
export function LearnerToaster() {
  const theme = useSchoolThemeStyle();
  const { mode, mounted } = useSchoolThemeMode();
  const card = theme.interactives.card;

  return (
    <Toaster
      position="bottom-right"
      theme={mounted ? mode : "light"}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            "flex w-full items-start gap-3 bg-card p-4 text-card-foreground",
            card.border?.width,
            card.border?.radius,
            card.border?.style,
            card.shadow,
            card.padding?.x,
            card.padding?.y,
            card.custom,
          ),
          content: "grid min-w-0 flex-1 gap-1",
          title: cn(...typographyClasses(theme.typography.text2)),
          description: cn(
            "text-muted-foreground",
            ...typographyClasses(theme.typography.caption),
          ),
          icon: "mt-0.5 shrink-0 text-primary",
        },
      }}
    />
  );
}

export { toast };
