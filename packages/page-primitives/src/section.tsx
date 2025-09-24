import React from "react";
import { cn } from "./lib/utils";
import type { SectionBackground, ThemeStyle } from "@courselit/page-models";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
    component?: "header" | "footer" | "section";
    background?: SectionBackground;
    nextTheme?: "dark" | "light";
}

export const Section: React.FC<SectionProps> = ({
    children,
    className = "",
    theme,
    background,
    nextTheme,
    component = "section",
    ...props
}) => {
    // const classes = cn(theme?.structure?.section?.verticalPadding, className);
    const classes = cn("bg-background text-foreground relative", className);

    return (
        <>
            {React.createElement(
                component as React.ElementType,
                {
                    className: classes,
                    ...props,
                },
                <>
                    {background && (
                        <div
                            suppressHydrationWarning
                            className="absolute inset-0 z-0"
                            style={{
                                backgroundColor:
                                    background?.type === "color"
                                        ? nextTheme === "dark"
                                            ? background?.backgroundColorDark ||
                                              background?.backgroundColor
                                            : background?.backgroundColor
                                        : undefined,
                                backgroundImage:
                                    background?.type === "image"
                                        ? `url(${background.media?.file})`
                                        : background?.type === "gradient"
                                          ? nextTheme === "dark"
                                              ? background.backgroundImageDark ||
                                                background.backgroundImage
                                              : background.backgroundImage
                                          : undefined,
                                backgroundSize:
                                    background?.type === "image"
                                        ? background?.backgroundSize || "cover"
                                        : background?.type === "gradient"
                                          ? (background as any)
                                                ?.gradientBackgroundSize ||
                                            "cover"
                                          : undefined,
                                backgroundPosition:
                                    background?.type === "image"
                                        ? background?.backgroundPosition ||
                                          "center"
                                        : background?.type === "gradient"
                                          ? (background as any)
                                                ?.gradientBackgroundPosition ||
                                            "center"
                                          : undefined,
                                backgroundRepeat:
                                    background?.type === "image"
                                        ? background?.backgroundRepeat ||
                                          "no-repeat"
                                        : background?.type === "gradient"
                                          ? (background as any)
                                                ?.gradientBackgroundRepeat ||
                                            "no-repeat"
                                          : undefined,
                                maskImage:
                                    background?.type === "image"
                                        ? background?.maskImage
                                        : background?.type === "gradient"
                                          ? (background as any)
                                                ?.gradientMaskImage
                                          : undefined,
                                WebkitMaskImage:
                                    background?.type === "image"
                                        ? background?.maskImage
                                        : background?.type === "gradient"
                                          ? (background as any)
                                                ?.gradientMaskImage
                                          : undefined,
                            }}
                        />
                    )}
                    {background && background.type === "image" && (
                        <div
                            className="absolute inset-0 z-1"
                            style={{
                                backgroundColor:
                                    nextTheme === "dark"
                                        ? background?.overlay?.colorDark ||
                                          background?.overlay?.color
                                        : background?.overlay?.color,
                                opacity: background?.overlay?.opacity
                                    ? background.overlay.opacity / 10
                                    : 0,
                                mixBlendMode: background?.overlay?.blendMode,
                            }}
                        />
                    )}
                    {background && background.type === "image" && (
                        <div
                            className="absolute inset-0 z-2"
                            style={{
                                backdropFilter: background?.blur
                                    ? `blur(${background?.blur}px)`
                                    : undefined,
                            }}
                        />
                    )}
                    <div
                        className={cn(
                            "mx-auto z-3 relative",
                            `lg:${theme?.structure?.page?.width || "max-w-6xl"}`,
                            theme?.structure?.section?.padding?.x || "px-4",
                            theme?.structure?.section?.padding?.y || "py-4",
                        )}
                    >
                        <div
                            className="hidden"
                            aria-hidden="true"
                            role="presentation"
                        >
                            {nextTheme}
                        </div>{" "}
                        {/** This is used to force re-render the component when the theme changes */}
                        {children}
                    </div>
                </>,
            )}
        </>
    );
};
