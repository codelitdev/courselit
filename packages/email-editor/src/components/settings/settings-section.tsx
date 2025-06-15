"use client";

import type React from "react";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function SettingsSection({
    title,
    children,
    className = "",
}: SettingsSectionProps) {
    return (
        <div className={cn("space-y-4 border-t pt-4 mt-4", className)}>
            {title && (
                <div className="text-sm font-medium text-gray-700">{title}</div>
            )}
            <div className="space-y-4">{children}</div>
        </div>
    );
}
