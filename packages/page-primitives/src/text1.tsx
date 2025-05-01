import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Text1: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.text1;
    const classes = cn(
        // Base styles
        "leading-7 [&:not(:first-child)]:mt-6",
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
