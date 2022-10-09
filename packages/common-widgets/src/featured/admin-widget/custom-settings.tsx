import * as React from "react";
import { useState, useEffect } from "react";
import { FormLabel, Grid, TextField, Typography } from "@mui/material";
import Settings from "../settings";
import { TextEditor, Select } from "@courselit/components-library";

interface CustomSettingsProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function CustomSettings({
    name,
    settings,
    onChange,
}: CustomSettingsProps) {
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(settings.description);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [alignment, setAlignment] = useState(settings.alignment || "left");
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor || "inherit"
    );
    const [color, setColor] = useState(settings.color || "inherit");

    useEffect(() => {
        onChange({
            title,
            description,
            buttonCaption,
            alignment,
            buttonAction,
            backgroundColor,
            color,
        });
    }, [
        title,
        description,
        buttonCaption,
        alignment,
        buttonAction,
        backgroundColor,
        color,
    ]);

    return (
        <>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    value={title}
                    label="Custom title"
                    onChange={(e) => setTitle(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <FormLabel>Custom description</FormLabel>
                <TextEditor
                    initialContent={description}
                    onChange={(state: any) => setDescription(state)}
                    showToolbar={false}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    value={buttonCaption}
                    label="Button caption"
                    onChange={(e) => setButtonCaption(e.target.value)}
                />
            </Grid>
            {name === "banner" && settings.type === "site" && (
                <Grid item xs={12} sx={{ mb: 2 }}>
                    <TextField
                        variant="outlined"
                        fullWidth
                        value={buttonAction}
                        label="Button Action (URL)"
                        onChange={(e) => setButtonAction(e.target.value)}
                    />
                </Grid>
            )}
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Select
                    title="Alignment"
                    value={alignment}
                    options={[
                        { label: "Top", value: "top" },
                        { label: "Bottom", value: "bottom" },
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value) => setAlignment(value)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Background color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Text color</Typography>
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
        </>
    );
}
