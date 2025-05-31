import React from "react";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
    component?: "header" | "footer" | "section";
    style?: Record<string, string>;
}

export const Section: React.FC<SectionProps> = ({
    children,
    className = "",
    theme,
    style,
    component = "section",
    ...props
}) => {
    // const classes = cn(theme?.structure?.section?.verticalPadding, className);
    const classes = cn("bg-background text-foreground", className);
    const styleWithBackground = {
        ...style,
        backgroundColor: style?.backgroundColor,
        color: style?.color,
    };

    return (
        <>
            {React.createElement(
                component as React.ElementType,
                {
                    className: classes,
                    style: styleWithBackground,
                    ...props,
                },
                <div
                    className={cn(
                        "mx-auto",
                        `lg:${theme?.structure?.page?.width || "max-w-6xl"}`,
                        theme?.structure?.section?.padding?.x || "px-4",
                        theme?.structure?.section?.padding?.y || "py-4",
                    )}
                >
                    {children}
                </div>,
            )}
        </>
    );
};
