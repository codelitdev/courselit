import React from "react";
import { cn } from "./lib/utils";
import { Header4 } from "./header4";
import type { ThemeStyle } from "@courselit/page-models";

export interface PageCardProps extends React.HTMLAttributes<HTMLDivElement> {
    isLink?: boolean;
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
}

export interface PageCardImageProps
    extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    theme?: ThemeStyle;
}

export interface PageCardContentProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
}

export interface PageCardHeaderProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
}

export const PageCard: React.FC<PageCardProps> = ({
    isLink,
    children,
    className = "",
    theme,
    ...props
}) => {
    const cardStyles = theme?.interactives?.card;
    const classes = cn(
        // Base styles
        "bg-card text-card-foreground",
        // Theme interactivity
        cardStyles?.border?.width,
        cardStyles?.border?.radius,
        cardStyles?.border?.style,
        cardStyles?.shadow,
        isLink ? "cursor-pointer" : "",
        // User overrides
        cardStyles?.custom,
        className,
    );

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
};

export const PageCardImage: React.FC<PageCardImageProps> = ({
    src,
    alt,
    className = "",
    theme,
    ...props
}) => {
    // const cardStyles = theme?.interactives?.card;
    const classes = cn(
        // Base styles
        "w-full",
        className,
    );

    return <img src={src} alt={alt} className={classes} {...props} />;
};

export const PageCardContent: React.FC<PageCardContentProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const cardStyles = theme?.interactives?.card;
    const classes = cn(
        // Base styles
        "p-4",
        // Theme interactivity
        cardStyles?.padding?.x,
        cardStyles?.padding?.y,
        className,
    );

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
};

export const PageCardHeader: React.FC<PageCardHeaderProps> = ({
    children,
    className = "",
    theme,
    ...props
}) => {
    const classes = cn(
        // Base styles
        "pb-4",
        className,
    );

    return (
        <div className={classes} {...props}>
            <Header4 theme={theme}>{children}</Header4>
        </div>
    );
};
