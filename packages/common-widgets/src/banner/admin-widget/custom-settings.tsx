import * as React from "react";
import { useState, useEffect } from "react";
import { FormLabel, Grid, TextField, Typography } from "@mui/material";
import Settings from "../settings";
import {
    TextEditor,
    Select,
    ColorSelector,
    AdminWidgetPanel,
} from "@courselit/components-library";
import { Alignment } from "@courselit/common-models";

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
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground
    );
    const [textAlignment, setTextAlignment] = useState<Alignment>(
        settings.textAlignment || "left"
    );

    useEffect(() => {
        onChange({
            title,
            description,
            buttonCaption,
            alignment,
            buttonAction,
            backgroundColor,
            color,
            buttonBackground,
            buttonForeground,
            textAlignment,
        });
    }, [
        title,
        description,
        buttonCaption,
        alignment,
        buttonAction,
        backgroundColor,
        color,
        buttonBackground,
        buttonForeground,
        textAlignment,
    ]);

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Basic">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            variant="outlined"
                            fullWidth
                            value={title}
                            label="Custom title"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <FormLabel>Custom description</FormLabel>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Call to action">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            variant="outlined"
                            fullWidth
                            value={buttonCaption}
                            label="Button caption"
                            onChange={(e) => setButtonCaption(e.target.value)}
                        />
                    </Grid>
                    {name === "banner" && settings.type === "site" && (
                        <Grid item sx={{ mb: 2 }}>
                            <TextField
                                variant="outlined"
                                fullWidth
                                value={buttonAction}
                                label="Button Action (URL)"
                                onChange={(e) =>
                                    setButtonAction(e.target.value)
                                }
                            />
                        </Grid>
                    )}
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Button color"
                            value={buttonBackground}
                            onChange={(value: string) =>
                                setButtonBackground(value)
                            }
                        />
                    </Grid>
                    <Grid item>
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
                            value={color}
                            onChange={(value: string) => setColor(value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <Select
                            title="Text content position"
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
                    <Grid item>
                        <Select
                            title="Text alignment"
                            value={textAlignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                            ]}
                            onChange={(value: Alignment) =>
                                setTextAlignment(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
