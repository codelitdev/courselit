import React from "react";
import type { Theme } from "@courselit/common-models";
import {
    Button as ShadcnButton,
    type ButtonProps as ShadcnButtonProps,
} from "./components/ui/button";
import { cn } from "./lib/utils";

export interface ButtonProps extends ShadcnButtonProps {
    theme?: Theme;
}

export const Button: React.FC<ButtonProps> = ({
    variant = "default",
    size = "default",
    disabled = false,
    children,
    className = "",
    theme,
    ...props
}) => {
    const buttonStyles = theme?.interactives?.button;
    const typographyStyles = theme?.typography?.button;

    const classes = cn(
        // Base styles
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
        buttonStyles?.padding?.x,
        buttonStyles?.padding?.y,
        buttonStyles?.border?.width,
        buttonStyles?.border?.radius,
        buttonStyles?.border?.style,
        buttonStyles?.border?.color,
        buttonStyles?.shadow,
        // Theme hover states
        buttonStyles?.hover,
        // Theme disabled states
        disabled && buttonStyles?.disabled?.opacity,
        disabled && buttonStyles?.disabled?.cursor,
        disabled && buttonStyles?.disabled?.color,
        disabled && buttonStyles?.disabled?.background,
        disabled && buttonStyles?.disabled?.border,
        className,
    );

    return (
        <ShadcnButton
            variant={variant}
            size={size}
            disabled={disabled}
            className={classes}
            {...props}
        >
            {children}
        </ShadcnButton>
    );
};
