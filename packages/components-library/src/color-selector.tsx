import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { IconButton, Tooltip } from "@mui/material";
import { Close } from "@mui/icons-material";

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
        <Grid container justifyContent="space-between">
            <Grid item>
                <Typography variant="subtitle1">{title}</Typography>
            </Grid>
            <Grid item>
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
            </Grid>
        </Grid>
    );
}
