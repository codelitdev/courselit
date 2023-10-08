import * as React from "react";
import NextLink from "next/link";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    openInSameTab?: boolean;
    style?: Record<string, string>;
    className?: string;
}

export default function Link({
    href,
    children,
    openInSameTab,
    style,
    className = "",
}: LinkProps) {
    const isInternal = href && href.startsWith("/");
    const fullClasses = `${className}`;

    return isInternal ? (
        <NextLink href={href} style={{ ...style }} className={fullClasses}>
            {children}
        </NextLink>
    ) : (
        <a
            href={href}
            style={{ ...style }}
            target={openInSameTab ? "_self" : "_blank"}
            className={fullClasses}
        >
            {children}
        </a>
    );
}
