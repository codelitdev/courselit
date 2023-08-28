import * as React from "react";
import { Cross } from "@courselit/icons";
import IconButton from "./icon-button";
import Tooltip from "./tooltip";

interface ColorSelectorProps {
    title: string;
    value: string;
    onChange: (value?: string) => void;
}

export default function ColorSelector({
    title,
    value,
    onChange,
}: ColorSelectorProps) {
    return (
        <div className="flex justify-between">
            <p>{title}</p>
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
