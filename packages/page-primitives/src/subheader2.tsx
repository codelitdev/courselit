import React from "react";
import { TypographyProps } from "./typography";

export const Subheader2: React.FC<TypographyProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const typographyStyles = theme?.typography?.subheader2;
    const classes = [
        typographyStyles?.fontFamily || "font-sans",
        typographyStyles?.fontSize || "text-base",
        typographyStyles?.fontWeight || "font-medium",
        typographyStyles?.lineHeight || "leading-relaxed",
        typographyStyles?.letterSpacing || "tracking-normal",
        typographyStyles?.textTransform,
        typographyStyles?.textDecoration,
        typographyStyles?.textOverflow,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <h6 className={classes} {...props}>
            {children}
        </h6>
    );
};
