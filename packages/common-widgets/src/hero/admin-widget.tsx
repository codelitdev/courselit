import React, { useEffect, useState } from "react";
import type { Address, Auth, Media, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    MediaSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";

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
    const dummyDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                    },
                ],
            },
        ],
    };
    const [title, setTitle] = useState(settings.title || "Hero section");
    const [description, setDescription] = useState(
        settings.description || dummyDescription
    );
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
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Basic">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item>
                        <Typography variant="subtitle1">Description</Typography>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Media">
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
                    {/* <Grid item sx={{ mb: 2 }}>
                        <TextField
                            label="Youtube Video Id"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
                            fullWidth
                        />
                    </Grid> */}
                    <Grid item>
                        <Select
                            title="alignment"
                            value={alignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(value) => setAlignment(value)}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Call to action">
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
                        <ColorSelector
                            title="Button color"
                            value={buttonBackground}
                            onChange={(value: string) =>
                                setButtonBackground(value)
                            }
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <ColorSelector
                            title="Button text color"
                            value={buttonForeground}
                            onChange={(value: string) =>
                                setButtonForeground(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={backgroundColor}
                            onChange={(value: string) =>
                                setBackgroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Text color"
                            value={foregroundColor}
                            onChange={(value: string) =>
                                setForegroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <Select
                            title="Style"
                            value={style}
                            options={[
                                { label: "Normal", value: "normal" },
                                { label: "Card", value: "card" },
                            ]}
                            onChange={(value: "normal" | "card") =>
                                setStyle(value)
                            }
                        />
                    </Grid>
                    {/* <Grid item>
                        <TextField
                            label="Media border radius"
                            value={mediaBorderRadius}
                            type="number"
                            onChange={(e) =>
                                setMediaBorderRadius(+e.target.value)
                            }
                            fullWidth
                        />
                    </Grid> */}
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
