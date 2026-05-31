import React from "react";
import { Textarea as ShadcnTextarea } from "./components/ui/textarea";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    theme?: ThemeStyle;
    error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = "", theme, error = false, ...props }, ref) => {
        const inputStyles = theme?.interactives?.input;
        const typographyStyles = theme?.typography?.input;

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
            // Theme interactivity
            inputStyles?.padding?.x,
            inputStyles?.padding?.y,
            inputStyles?.border?.width,
            inputStyles?.border?.style,
            inputStyles?.border?.radius,
            inputStyles?.shadow,
            // Theme disabled states
            props.disabled && inputStyles?.disabled?.opacity,
            props.disabled && inputStyles?.disabled?.cursor,
            props.disabled && inputStyles?.disabled?.color,
            props.disabled && inputStyles?.disabled?.background,
            props.disabled && inputStyles?.disabled?.border,
            // Error state
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            // User overrides
            inputStyles?.custom,
            className,
        );

        return <ShadcnTextarea ref={ref} className={classes} {...props} />;
    },
);

Textarea.displayName = "Textarea";
