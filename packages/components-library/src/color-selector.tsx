import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { IconButton, Tooltip } from "@mui/material";
import { Close } from "@mui/icons-material";
//import { Close as CloseIcon } from "./icons/close"
//import { Tooltip as Tooltip2 } from './ui/tooltip'

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
            <div>
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <Tooltip title="Reset" placement="right" arrow>
                    <IconButton onClick={() => onChange()} size="small">
                        <Close />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}
