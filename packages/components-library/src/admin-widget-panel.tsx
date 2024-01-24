import * as React from "react";
import Section from "./section";

interface AdminWidgetPanelProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export default function AdminWidgetPanel({
    title,
    children,
    className = "",
}: AdminWidgetPanelProps) {
    return (
        <Section className={className}>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {children}
        </Section>
    );
}
