import * as React from "react";
import NextLink from "next/link";
import { Link as MuiLink } from "@mui/material";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    sxProps?: Record<string, unknown>;
}

export default function Link({ href, children, sxProps }: LinkProps) {
    const linkProps = Object.assign(
        {},
        {
            cursor: "pointer",
        },
        { ...sxProps }
    );

    return (
        <NextLink href={href}>
            <MuiLink sx={linkProps}>{children}</MuiLink>
        </NextLink>
    );
}
