import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Subheader1: React.FC<
    TypographyProps & { component?: "h5" | "span" }
> = ({ children, className = "", theme, component = "h5", ...props }) => {
    const typographyStyles = theme?.typography?.subheader1;
    const classes = cn(
        typographyStyles?.fontFamily || "font-sans",
        typographyStyles?.fontSize || "text-lg",
        typographyStyles?.fontWeight || "font-medium",
        typographyStyles?.lineHeight || "leading-relaxed",
        typographyStyles?.letterSpacing || "tracking-normal",
        typographyStyles?.textTransform,
        typographyStyles?.textDecoration,
        typographyStyles?.textOverflow,
        className,
    );

    return component === "h5" ? (
        <h5 className={classes} {...props}>
            {children}
        </h5>
    ) : (
        <span className={classes} {...props}>
            {children}
        </span>
    );
};
