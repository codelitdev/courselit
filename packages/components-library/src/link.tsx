import * as React from "react";
import NextLink from "next/link";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    openInSameTab?: boolean;
    style?: Record<string, string>;
}

export default function Link({
    href,
    children,
    openInSameTab,
    style,
}: LinkProps) {
    const isInternal = href.startsWith("/");

    return isInternal ? (
        <NextLink href={href} style={{ flexGrow: 1, ...style }}>
            {children}
        </NextLink>
    ) : (
        <a
            href={href}
            target={openInSameTab ? "_self" : "_blank"}
            style={{ flexGrow: 1, ...style }}
        >
            {children}
        </a>
    );
}
