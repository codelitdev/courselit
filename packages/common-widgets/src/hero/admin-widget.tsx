import React, { useEffect, useState } from "react";
import type { Address, Auth, Media, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";
import { MediaSelector, Select } from "@courselit/components-library";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
}

export default function AdminWidget({
    settings,
    onChange,
    dispatch,
    auth,
    profile,
    address,
}: AdminWidgetProps) {
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(settings.description);
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [mediaBorderRadius, setMediaBorderRadius] = useState(
        settings.mediaRadius
    );
    const [youtubeLink, setYoutubeLink] = useState(settings.youtubeLink);
    const [alignment, setAlignment] = useState(settings.alignment || "left");
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor
    );
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground
    );
    const [media, setMedia] = useState<Partial<Media>>(settings.media || {});
    const [style, setStyle] = useState(settings.style || "normal");

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            buttonAction,
            buttonCaption,
            youtubeLink,
            media,
            alignment,
            backgroundColor,
            foregroundColor,
            style,
            buttonBackground,
            buttonForeground,
            mediaRadius: mediaBorderRadius,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        buttonAction,
        buttonCaption,
        youtubeLink,
        alignment,
        backgroundColor,
        foregroundColor,
        style,
        buttonBackground,
        buttonForeground,
        media,
        mediaBorderRadius,
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
                <MediaSelector
                    title=""
                    src={media && media.thumbnail}
                    srcTitle={media && media.originalFileName}
                    dispatch={dispatch}
                    auth={auth}
                    profile={profile}
                    address={address}
                    onSelection={(media: Media) => {
                        if (media) {
                            setMedia(media);
                        }
                    }}
                    strings={{}}
                    access="public"
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
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Button color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={buttonBackground}
                            onChange={(e) =>
                                setButtonBackground(e.target.value)
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Button text color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={buttonForeground}
                            onChange={(e) =>
                                setButtonForeground(e.target.value)
                            }
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
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Media border radius"
                    value={mediaBorderRadius}
                    type="number"
                    onChange={(e) => setMediaBorderRadius(+e.target.value)}
                    fullWidth
                />
            </Grid>
        </Grid>
    );
}
