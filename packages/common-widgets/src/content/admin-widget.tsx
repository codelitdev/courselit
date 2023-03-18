import * as React from "react";
import { Alignment } from "@courselit/common-models";
import { useEffect, useState } from "react";
import Settings from "./settings";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}
export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [title, setTitle] = useState(settings.title || "Content");
    const [description, setDescription] = useState(settings.description);
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center"
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor
    );
    const [badgeBackgroundColor, setBadgeBackgroundColor] = useState(
        settings.badgeBackgroundColor
    );
    const [badgeForegroundColor, setBadgeForegroundColor] = useState(
        settings.badgeForegroundColor
    );

    useEffect(() => {
        onChange({
            title,
            description,
            headerAlignment,
            backgroundColor,
            foregroundColor,
            badgeBackgroundColor,
            badgeForegroundColor,
        });
    }, [
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        badgeBackgroundColor,
        badgeForegroundColor,
    ]);

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Header">
                    <Grid item>
                        <TextField
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ mt: 2 }}>
                            Description
                        </Typography>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </Grid>
                    <Grid item>
                        <Select
                            title="Header alignment"
                            value={headerAlignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                            ]}
                            onChange={(value: Alignment) =>
                                setHeaderAlignment(value)
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
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Badge color"
                            value={badgeBackgroundColor}
                            onChange={(value: string) =>
                                setBadgeBackgroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <ColorSelector
                            title="Badge text color"
                            value={badgeForegroundColor}
                            onChange={(value: string) =>
                                setBadgeForegroundColor(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
