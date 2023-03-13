import * as React from "react";
import { ReactNode } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

interface AdminWidgetPanelProps {
    title?: string;
    children: ReactNode;
}

export default function AdminWidgetPanel({
    title,
    children,
}: AdminWidgetPanelProps) {
    return (
        <Grid container direction="column">
            {title && (
                <Grid item sx={{ mb: 2 }}>
                    <Typography
                        variant="overline"
                        color="textSecondary"
                        sx={{ fontWeight: "bold" }}
                    >
                        {title}
                    </Typography>
                </Grid>
            )}
            {children}
        </Grid>
    );
}
