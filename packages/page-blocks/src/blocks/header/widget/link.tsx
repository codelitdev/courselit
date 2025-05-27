import React from "react";
import { Button, Link as PageLink } from "@courselit/page-primitives";
import { Link as AppLink } from "@courselit/components-library";
import { ThemeStyle } from "@courselit/page-models";

export default function Link({
    href,
    theme,
    linkFontWeight,
    onClick,
    isButton,
    label,
}: {
    href: string;
    theme: ThemeStyle;
    linkFontWeight: string;
    onClick?: () => void;
    isButton: boolean;
    label: string;
}) {
    return (
        <AppLink href={href} className={`${linkFontWeight}`} onClick={onClick}>
            {isButton && (
                <Button size="sm" theme={theme}>
                    {label}
                </Button>
            )}
            {!isButton && <PageLink theme={theme}>{label}</PageLink>}
        </AppLink>
    );
}
