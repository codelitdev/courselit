import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { TextRenderer } from "@courselit/components-library";

export default function Widget({
    settings: { title, description },
}: WidgetProps<Settings>) {
    return (
        <Grid container>
            {title && (
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="h2">{title}</Typography>
                </Grid>
            )}
            {description && (
                <Grid item sx={{ mb: 2 }}>
                    <TextRenderer json={description} />
                </Grid>
            )}
        </Grid>
    );
}
