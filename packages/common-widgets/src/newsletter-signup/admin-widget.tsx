import React, { useEffect, useState } from "react";
import type { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Grid, TextField, Typography } from "@mui/material";
import type Settings from "./settings";
import { Select } from "@courselit/components-library";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./constants";

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
    const [subtitle, setSubtitle] = useState(settings.subtitle);
    const [btnText, setBtnText] = useState(settings.btnText);
    const [successMessage, setSuccessMessage] = useState(
        settings.successMessage
    );
    const [failureMessage, setFailureMessage] = useState(
        settings.failureMessage
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor
    );
    const [btnBackgroundColor, setBtnBackgroundColor] = useState(
        settings.btnBackgroundColor
    );
    const [btnForegroundColor, setBtnForegroundColor] = useState(
        settings.btnBackgroundColor
    );
    const [alignment, setAlignment] = useState(settings.alignment || "left");

    useEffect(() => {
        onChange({
            title,
            subtitle,
            btnText,
            backgroundColor,
            foregroundColor,
            btnBackgroundColor,
            btnForegroundColor,
            alignment,
            successMessage,
            failureMessage,
        });
    }, [
        title,
        subtitle,
        btnText,
        backgroundColor,
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment,
        successMessage,
        failureMessage,
    ]);

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Title"
                    value={title}
                    placeholder={DEFAULT_TITLE}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Button text"
                    value={btnText}
                    placeholder={DEFAULT_BTN_TEXT}
                    onChange={(e) => setBtnText(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Success message"
                    value={successMessage}
                    placeholder={DEFAULT_SUCCESS_MESSAGE}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextField
                    label="Failure message"
                    value={failureMessage}
                    placeholder={DEFAULT_FAILURE_MESSAGE}
                    onChange={(e) => setFailureMessage(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Text color</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={foregroundColor}
                            onChange={(e) =>
                                setForegroundColor(
                                    e.target.value as `#${string}`
                                )
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
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
                            onChange={(e) =>
                                setBackgroundColor(
                                    e.target.value as `#${string}`
                                )
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Button color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={btnBackgroundColor}
                            onChange={(e) =>
                                setBtnBackgroundColor(
                                    e.target.value as `#${string}`
                                )
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Button text</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={btnForegroundColor}
                            onChange={(e) =>
                                setBtnForegroundColor(
                                    e.target.value as `#${string}`
                                )
                            }
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Select
                    value={alignment}
                    title="Alignment"
                    onChange={(value: Settings["alignment"]) =>
                        setAlignment(value)
                    }
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                        { label: "Right", value: "right" },
                    ]}
                />
            </Grid>
        </Grid>
    );
}
