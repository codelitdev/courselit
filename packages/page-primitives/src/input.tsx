import React from "react";
import { Input as ShadcnInput } from "./components/ui/input";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    theme?: ThemeStyle;
    error?: boolean;
    style?: React.CSSProperties;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", theme, error = false, style = {}, ...props }, ref) => {
        const inputStyles = theme?.interactives?.input;
        const typographyStyles = theme?.typography?.input;

        const classes = cn(
            // Base styles
            // "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
            inputStyles?.borderRadius,
            inputStyles?.padding?.x,
            inputStyles?.padding?.y,
            inputStyles?.border?.width,
            inputStyles?.border?.style,
            // inputStyles?.border?.color,
            inputStyles?.shadow,
            // Theme hover states
            inputStyles?.hover,
            // Theme disabled states
            props.disabled && inputStyles?.disabled?.opacity,
            props.disabled && inputStyles?.disabled?.cursor,
            props.disabled && inputStyles?.disabled?.color,
            props.disabled && inputStyles?.disabled?.background,
            props.disabled && inputStyles?.disabled?.border,
            // Error state
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            className,
        );

        return (
            <ShadcnInput
                ref={ref}
                className={classes}
                style={{
                    ...style,
                    borderColor: theme?.colors?.border,
                }}
                {...props}
            />
        );
    },
);

Input.displayName = "Input";
