import React from "react";
import {
    Badge as ShadcnBadge,
    type BadgeProps as ShadcnBadgeProps,
} from "./components/ui/badge";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface BadgeProps extends Omit<ShadcnBadgeProps, "variant"> {
    theme?: ThemeStyle;
    style?: Record<string, string>;
    variant?: "default" | "secondary" | "destructive" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
    variant = "default",
    children,
    className = "",
    style = {},
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.caption;
    const buttonStyles = theme?.interactives?.button;

    const classes = cn(
        // Base styles
        "",
        // Theme typography from caption
        typographyStyles?.fontFamily,
        typographyStyles?.fontSize,
        typographyStyles?.fontWeight,
        typographyStyles?.lineHeight,
        typographyStyles?.letterSpacing,
        typographyStyles?.textTransform,
        buttonStyles?.border?.width,
        buttonStyles?.border?.radius,
        buttonStyles?.border?.style,
        className,
    );

    return (
        <ShadcnBadge
            variant={variant}
            className={classes}
            style={{
                ...style,
                backgroundColor:
                    style.backgroundColor || theme?.colors?.secondary,
                color: style.color || theme?.colors?.buttonText,
                borderColor: theme?.colors?.border,
            }}
            {...props}
        >
            {children}
        </ShadcnBadge>
    );
};
