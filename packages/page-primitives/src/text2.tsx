import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Text2: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.text2;
    const classes = cn(
        // Base styles
        "text-sm leading-7 [&:not(:first-child)]:mt-6",
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

    return (
        <p className={classes} {...props}>
            {children}
        </p>
    );
};
