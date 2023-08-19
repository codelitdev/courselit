import * as React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Cross } from "@courselit/icons";

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
                <Tooltip title="Reset" placement="right" arrow>
                    <IconButton onClick={() => onChange()} size="small">
                        <Cross />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}
