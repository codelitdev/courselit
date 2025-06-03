import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Text1: React.FC<
    TypographyProps & { component?: "p" | "span" }
> = ({ children, className = "", theme, component = "p", ...props }) => {
    const typographyStyles = theme?.typography?.text1;
    const classes = cn(
        // Base styles
        "text-base",
        // Theme overrides
        typographyStyles?.fontFamily,
        typographyStyles?.fontSize,
        typographyStyles?.fontWeight,
        typographyStyles?.lineHeight,
        typographyStyles?.letterSpacing,
        typographyStyles?.textTransform,
        typographyStyles?.textDecoration,
        typographyStyles?.textOverflow,
        className,
    );

    return component === "p" ? (
        <p className={classes} {...props}>
            {children}
        </p>
    ) : (
        <span className={classes} {...props}>
            {children}
        </span>
    );
};
