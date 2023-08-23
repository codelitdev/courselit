import * as React from "react";
import { Tooltip } from "@mui/material";
import { Cross } from "@courselit/icons";
import IconButton from "./icon-button";

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
                    <IconButton onClick={() => onChange()} variant="soft">
                        <Cross />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}
