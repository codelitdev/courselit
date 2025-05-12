import React from "react";
import type { Theme } from "@courselit/common-models";
import { cn } from "./lib/utils";

export interface LinkProps
    extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
    disabled?: boolean;
}

export const Link: React.FC<LinkProps> = ({
    children,
    className = "",
    theme,
    disabled = false,
    ...props
}) => {
    const typographyStyles = theme?.typography?.link;
    const linkStyles = theme?.interactives?.link;
    const classes = cn(
        // Base styles
        "font-medium text-primary",
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
        linkStyles?.border?.color,
        linkStyles?.shadow,
        // Theme hover states
        linkStyles?.hover,
        // Theme disabled states
        disabled && linkStyles?.disabled?.color,
        disabled && linkStyles?.disabled?.background,
        disabled && linkStyles?.disabled?.border,
        disabled && linkStyles?.disabled?.opacity,
        disabled && linkStyles?.disabled?.cursor,
        className,
    );

    return (
        <span className={classes} {...props}>
            {children}
        </span>
    );
};
