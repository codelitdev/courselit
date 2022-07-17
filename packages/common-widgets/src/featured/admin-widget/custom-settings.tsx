import * as React from "react";
import { useState, useEffect } from "react";
import { FormLabel, Grid, TextField } from "@mui/material";
import Settings from "../settings";
import { RichText as TextEditor, Select } from "@courselit/components-library";

interface CustomSettingsProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function CustomSettings({
    settings,
    onChange,
}: CustomSettingsProps) {
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(
        settings.description
            ? TextEditor.hydrate({ data: settings.description })
            : TextEditor.emptyState()
    );
    const [buyButtonCaption, setBuyButtonCaption] = useState(
        settings.buyButtonCaption
    );
    const [alignment, setAlignment] = useState(settings.alignment || "left");

    useEffect(() => {
        onChange({
            title,
            description: TextEditor.stringify(description),
            buyButtonCaption,
            alignment,
        });
    }, [title, description, buyButtonCaption, alignment]);

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
                    initialContentState={description}
                    onChange={(editorState: any) => setDescription(editorState)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    value={buyButtonCaption}
                    label="Buy button"
                    onChange={(e) => setBuyButtonCaption(e.target.value)}
                />
            </Grid>
            <Grid item xs={12}>
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
        </>
    );
}
