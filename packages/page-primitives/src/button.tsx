import React from "react";
import {
    Button as ShadcnButton,
    type ButtonProps as ShadcnButtonProps,
} from "./components/ui/button";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface ButtonProps extends ShadcnButtonProps {
    theme?: ThemeStyle;
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
        "",
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
        // buttonStyles?.border?.color,
        buttonStyles?.shadow,
        // Theme disabled states
        disabled && buttonStyles?.disabled?.opacity,
        disabled && buttonStyles?.disabled?.cursor,
        disabled && buttonStyles?.disabled?.color,
        disabled && buttonStyles?.disabled?.background,
        disabled && buttonStyles?.disabled?.border,
        // User overrides
        buttonStyles?.custom,
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
