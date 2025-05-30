import React from "react";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface LinkProps
    extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export const Link: React.FC<LinkProps> = ({
    children,
    className = "",
    theme,
    disabled = false,
    style,
    ...props
}) => {
    const typographyStyles = theme?.typography?.link;
    const linkStyles = theme?.interactives?.link;
    const classes = cn(
        // Base styles
        "font-medium",
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
        linkStyles?.padding?.x,
        linkStyles?.padding?.y,
        linkStyles?.border?.width,
        linkStyles?.border?.radius,
        linkStyles?.border?.style,
        // Theme disabled states
        disabled && linkStyles?.disabled?.color,
        disabled && linkStyles?.disabled?.background,
        disabled && linkStyles?.disabled?.border,
        disabled && linkStyles?.disabled?.opacity,
        disabled && linkStyles?.disabled?.cursor,
        // User overrides
        linkStyles?.custom,
        className,
    );

    return (
        <span
            className={classes}
            style={{
                ...style,
                textShadow: linkStyles?.textShadow || undefined,
            }}
            {...props}
        >
            {children}
        </span>
    );
};
