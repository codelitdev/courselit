import React, { useEffect, useState } from "react";
import type { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";
import { Select } from "@courselit/components-library";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}
export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(settings.description);
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [mediaId, setMediaId] = useState(settings.mediaId);
    const [youtubeLink, setYoutubeLink] = useState(settings.youtubeLink);
    const [alignment, setAlignment] = useState(settings.alignment || "left");
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor
    );
    const [style, setStyle] = useState(settings.style || "normal");

    useEffect(() => {
        onChange({
            title,
            description,
            buttonAction,
            buttonCaption,
            mediaId,
            youtubeLink,
            alignment,
            backgroundColor,
            foregroundColor,
            style,
        });
    }, [
        title,
        description,
        buttonAction,
        buttonCaption,
        mediaId,
        youtubeLink,
        alignment,
        backgroundColor,
        foregroundColor,
        style,
    ]);

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minRows={5}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Youtube Video Id"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Button Text"
                    value={buttonCaption}
                    onChange={(e) => setButtonCaption(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Button Action"
                    value={buttonAction}
                    onChange={(e) => setButtonAction(e.target.value)}
                    fullWidth
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
                            value={foregroundColor}
                            onChange={(e) => setForegroundColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Select
                    title="Alignment"
                    value={alignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value) => setAlignment(value)}
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Select
                    title="Style"
                    value={style}
                    options={[
                        { label: "Normal", value: "normal" },
                        { label: "Card", value: "card" },
                    ]}
                    onChange={(value) => setStyle(value)}
                />
            </Grid>
        </Grid>
    );
}
