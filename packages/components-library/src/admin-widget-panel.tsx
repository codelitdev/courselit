import * as React from "react";

interface AdminWidgetPanelProps {
    title?: string;
    children: React.ReactNode;
}

export default function AdminWidgetPanel({
    title,
    children,
}: AdminWidgetPanelProps) {
    return (
        <div className="flex flex-col">
            {title && <h2 className="font-bold mb-4">{title}</h2>}
            {children}
        </div>
    );
}
