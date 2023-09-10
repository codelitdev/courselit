import { AdminWidgetPanel, ColorSelector } from "@courselit/components-library";
import React, { useEffect, useState } from "react";
import type Settings from "./settings";

export interface AdminWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

export default function AdminWidget({
    settings: { backgroundColor = "#eee", textColor },
    onChange,
}: AdminWidgetProps) {
    const [bgColor, setBgColor] = useState<string | undefined>(backgroundColor);
    const [color, setColor] = useState(textColor);

    useEffect(() => {
        onChange({
            textColor: color,
            backgroundColor: bgColor,
        });
    }, [bgColor, color]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <AdminWidgetPanel title="Design">
                    <ColorSelector
                        title="Text color"
                        value={color || "inherit"}
                        onChange={(value?: string) => setColor(value)}
                    />
                    <ColorSelector
                        title="Background color"
                        value={bgColor || "inherit"}
                        onChange={(value?: string) => setBgColor(value)}
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}
