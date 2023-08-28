import * as React from "react";
import NextLink from "next/link";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    openInSameTab?: boolean;
}

export default function Link({ href, children, openInSameTab }: LinkProps) {
    const isInternal = href.startsWith("/");

    return isInternal ? (
        <NextLink href={href} style={{ flexGrow: 1 }}>
            {children}
        </NextLink>
    ) : (
        <a
            href={href}
            target={openInSameTab ? "_self" : "_blank"}
            style={{ flexGrow: 1 }}
        >
            {children}
        </a>
    );
}
