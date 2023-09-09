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
    className = ""
}: LinkProps) {
    const isInternal = href.startsWith("/");

    return isInternal ? (
        <NextLink href={href} style={{ flexGrow: 1, ...style }}>
            <span className={`hover:underline ${className}`}>
            {children}
            </span>
        </NextLink>
    ) : (
        <a
            href={href}
            target={openInSameTab ? "_self" : "_blank"}
            style={{ flexGrow: 1, ...style }}
            className={`hover:underline ${className}`}
        >
            {children}
        </a>
    );
}
