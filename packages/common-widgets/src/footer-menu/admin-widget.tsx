import React from "react";
import type Settings from "./settings";

export interface AdminWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    return <div></div>;
}
