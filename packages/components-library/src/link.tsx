import * as React from "react";
import NextLink from "next/link";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    sxProps?: Record<string, unknown>;
}

export default function Link({ href, children }: LinkProps) {
    return <NextLink href={href}>{children}</NextLink>;
}
