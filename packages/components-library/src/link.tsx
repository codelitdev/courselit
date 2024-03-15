import * as React from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

interface LinkProps {
    href: string;
    children?: React.ReactNode;
    openInSameTab?: boolean;
    style?: Record<string, string>;
    className?: string;
    onClick?: () => void;
}

export default function Link({
    href,
    children,
    openInSameTab = true,
    style,
    className = "",
    onClick,
}: LinkProps) {
    const isInternal = href && href.startsWith("/");
    const isInPageNavigation = href && href.startsWith("#");
    const router = useRouter();

    if (isInPageNavigation) {
        return (
            <a
                href={href}
                style={{ ...style }}
                className={className}
                onClick={onClick}
            >
                {children}
            </a>
        );
    }

    return isInternal ? (
        <NextLink
            href={href}
            style={{ ...style }}
            onClick={() => {
                router.push(href.toString());
                if (onClick) {
                    onClick();
                }
            }}
            className={className}
        >
            {children}
        </NextLink>
    ) : (
        <a
            href={href}
            style={{ ...style }}
            className={className}
            onClick={(e) => {
                e.preventDefault();

                if (openInSameTab) {
                    window.location.href = href;
                } else {
                    window.open(href, "_blank");
                }
                if (onClick) {
                    onClick();
                }
            }}
        >
            {children}
        </a>
    );
}
