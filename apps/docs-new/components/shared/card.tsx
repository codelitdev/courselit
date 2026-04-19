"use client";

import { ReactNode } from "react";

export type CardAccent =
    | "blue"
    | "purple"
    | "pink"
    | "teal"
    | "amber"
    | "indigo"
    | "rose"
    | "orange"
    | "fuchsia"
    | "cyan"
    | "slate"
    | "violet"
    | "green"
    | "sky";

interface DocCardProps {
    href: string;
    title: string;
    description: string;
    icon?: ReactNode;
    accent?: CardAccent;
    className?: string;
    newTab?: boolean;
}

export function DocCard({
    href,
    title,
    description,
    icon,
    accent,
    className = "",
    newTab = false,
}: DocCardProps) {
    return (
        <a
            href={href}
            target={newTab ? "_blank" : undefined}
            rel={newTab ? "noreferrer" : undefined}
            className={`doc-card ${className}`}
            data-accent={accent}
        >
            {icon && <div className="doc-card-badge">{icon}</div>}
            <h3>{title}</h3>
            <p>{description}</p>
        </a>
    );
}
