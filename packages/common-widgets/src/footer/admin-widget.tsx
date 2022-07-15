import { Grid, TextField, Typography } from "@mui/material";
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
    const [bgColor, setBgColor] = useState(backgroundColor);
    const [color, setColor] = useState(textColor);

    useEffect(() => {
        onChange({
            textColor: color,
            backgroundColor: bgColor,
        });
    }, [bgColor, color]);

    return (
        <Grid container>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Text</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Background</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
