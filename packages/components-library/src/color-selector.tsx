import * as React from "react";
import { Cross, Help } from "@courselit/icons";
import IconButton from "./icon-button";
import Tooltip from "./tooltip";

interface ColorSelectorProps {
    title: string;
    value: string;
    onChange: (value?: string) => void;
    tooltip?: string;
}

export default function ColorSelector({
    title,
    value,
    onChange,
    tooltip,
}: ColorSelectorProps) {
    return (
        <div className="flex justify-between">
            <div className="flex grow items-center gap-1">
                <p>{title}</p>
                {tooltip && (
                    <Tooltip title={tooltip}>
                        <Help />
                    </Tooltip>
                )}
            </div>
            <div className="flex items-center">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <Tooltip title="Reset">
                    <IconButton onClick={() => onChange()} variant="soft">
                        <Cross />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}
