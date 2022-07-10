import React from "react";
import { Section } from "@courselit/components-library";
import { Grid, Typography } from "@mui/material";
import Settings from "./settings";

export default function Widget({
    settings = { text: "" },
}: {
    settings: Settings;
}) {
    return (
        <Grid item>
            <Section>
                <Typography>{settings.text}</Typography>
            </Section>
        </Grid>
    );
}
