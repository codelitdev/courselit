import React from "react";
import { Theme } from "@courselit/common-models";
import { cn } from "./lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
    component?: "header" | "footer" | "section";
}

export const Section: React.FC<SectionProps> = ({
    children,
    className = "",
    theme,
    style,
    component = "section",
    ...props
}) => {
    const classes = cn(theme?.structure?.section?.verticalPadding, className);
    const styleWithBackground = {
        backgroundColor: theme?.colors?.background,
        color: theme?.colors?.text,
        ...style,
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
