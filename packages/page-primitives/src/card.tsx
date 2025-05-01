import React from "react";
import { Link } from "./link";
import type { Theme } from "@courselit/common-models";
import { cn } from "./lib/utils";
import { Header4 } from "./header4";

export interface PageCardProps extends React.HTMLAttributes<HTMLDivElement> {
    href?: string;
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
}

export interface PageCardImageProps
    extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    theme?: Theme;
}

export interface PageCardContentProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
}

export interface PageCardHeaderProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
}

export const PageCard: React.FC<PageCardProps> = ({
    href,
    children,
    className = "",
    theme,
    ...props
}) => {
    const cardStyles = theme?.interactives?.card;
    const classes = cn(
        // Base styles
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        // Theme interactivity
        cardStyles?.border?.width,
        cardStyles?.border?.radius,
        cardStyles?.border?.style,
        cardStyles?.border?.color,
        cardStyles?.shadow,
        cardStyles?.padding?.x,
        cardStyles?.padding?.y,
        // Theme hover states
        cardStyles?.hover?.shadow,
        cardStyles?.hover?.border?.width,
        cardStyles?.hover?.border?.radius,
        cardStyles?.hover?.border?.style,
        cardStyles?.hover?.border?.color,
        cardStyles?.hover?.background,
        cardStyles?.hover?.color,
        className,
    );

    const cardContent = (
        <div className={classes} {...props}>
            {children}
        </div>
    );

    if (href) {
        return (
            <Link href={href} theme={theme} className="block">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
};

export const PageCardImage: React.FC<PageCardImageProps> = ({
    src,
    alt,
    className = "",
    theme,
    ...props
}) => {
    const cardStyles = theme?.interactives?.card;
    const classes = cn(
        // Base styles
        "w-full",
        // Theme interactivity
        cardStyles?.border?.width,
        cardStyles?.border?.radius,
        cardStyles?.border?.style,
        cardStyles?.border?.color,
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
        "p-6 pt-0",
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
        "flex flex-col space-y-1.5 py-4",
        className,
    );

    return (
        <div className={classes} {...props}>
            <Header4 theme={theme}>{children}</Header4>
        </div>
    );
};
