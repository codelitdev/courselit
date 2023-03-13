import { AdminWidgetPanel, ColorSelector } from "@courselit/components-library";
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
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Text color"
                            value={color}
                            onChange={(value: string) => setColor(value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={bgColor}
                            onChange={(value: string) => setBgColor(value)}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
