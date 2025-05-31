import React from "react";
import { TypographyProps } from "./typography";
import { cn } from "./lib/utils";

export const Header4: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.header4;
    const classes = cn(
        // Base styles
        "scroll-m-20 text-xl font-semibold tracking-normal",
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
        <h4 className={classes} {...props}>
            {children}
        </h4>
    );
};
