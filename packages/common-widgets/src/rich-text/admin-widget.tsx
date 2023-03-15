import React, { useEffect, useState } from "react";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";
import { Grid, Typography } from "@mui/material";
import Settings from "./settings";
import { Alignment } from "@courselit/common-models";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = ({ settings, onChange }: AboutWidgetProps) => {
    const dummyText: Record<string, unknown> = {
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
    const [content, setContent] = useState(settings.text || dummyText);
    const [alignment, setAlignment] = useState<Alignment | "right">(
        settings.alignment || "left"
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [color, setColor] = useState(settings.color);

    useEffect(() => {
        onChange({
            text: content,
            alignment,
            color,
            backgroundColor,
        });
    }, [content, alignment, color, backgroundColor]);

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Basic">
                    <Grid item>
                        <Typography variant="subtitle1">Text</Typography>
                        <TextEditor
                            initialContent={content}
                            onChange={(state: any) => setContent(state)}
                            showToolbar={false}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Text color"
                            value={color}
                            onChange={(value: string) => setColor(value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={backgroundColor}
                            onChange={(value: string) =>
                                setBackgroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <Select
                            title="Alignment"
                            value={alignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(value: Alignment) => setAlignment(value)}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
};

export default AdminWidget;
