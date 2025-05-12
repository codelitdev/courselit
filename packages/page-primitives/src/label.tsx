import React from "react";
import type { Theme } from "@courselit/common-models";
import { Label as ShadcnLabel } from "./components/ui/label";
import { cn } from "./lib/utils";

export interface LabelProps
    extends React.LabelHTMLAttributes<HTMLLabelElement> {
    theme?: Theme;
    error?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className = "", theme, error = false, ...props }, ref) => {
        const typographyStyles = theme?.typography?.text2;

        const classes = cn(
            // Theme typography
            typographyStyles?.fontFamily,
            typographyStyles?.fontSize,
            typographyStyles?.fontWeight,
            typographyStyles?.lineHeight,
            typographyStyles?.letterSpacing,
            typographyStyles?.textTransform,
            typographyStyles?.textDecoration,
            typographyStyles?.textOverflow,
            // Error state
            error && "text-red-500",
            className,
        );

        return <ShadcnLabel ref={ref} className={classes} {...props} />;
    },
);

Label.displayName = "Label";
