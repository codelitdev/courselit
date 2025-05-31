import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Preheader: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.preheader;
    const classes = cn(
        // Base styles
        "text-sm font-medium uppercase tracking-wide",
        // Theme typography
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

    return (
        <p className={classes} {...props}>
            {children}
        </p>
    );
};
