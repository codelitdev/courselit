import React, { useState } from "react";
import type { WidgetProps } from "@courselit/common-models";
import { Button, Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";
import { RichText as TextEditor } from "@courselit/components-library";

const Widget = ({
    settings: {
        title,
        subtitle = "Sign up here to get the latest articles, news and updates.",
        btnText,
        backgroundColor = "#eee",
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment = "left",
    },
}: WidgetProps<Settings>) => {
    const [email, setEmail] = useState("");
    const submitEmail = async () => {};

    return (
        <Grid
            container
            direction="column"
            justifyContent={alignment}
            sx={{
                p: 2,
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <Grid item sx={{ mb: 2 }}>
                <Typography variant="h4">
                    {title || "Sign up for my newsletter"}
                </Typography>
            </Grid>
            {subtitle && (
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">{subtitle}</Typography>
                </Grid>
            )}
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Email"
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                />
            </Grid>
            <Grid item>
                <Button
                    onClick={submitEmail}
                    sx={{
                        backgroundColor: btnBackgroundColor,
                        color: btnForegroundColor,
                    }}
                >
                    {btnText || "Subscribe"}
                </Button>
            </Grid>
        </Grid>
    );
};

export default Widget;
