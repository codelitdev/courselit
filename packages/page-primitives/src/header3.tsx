import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Header3: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.header3;
    const classes = cn(
        // Base styles
        "scroll-m-20 text-2xl font-semibold tracking-normal",
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
        <h3 className={classes} {...props}>
            {children}
        </h3>
    );
};
