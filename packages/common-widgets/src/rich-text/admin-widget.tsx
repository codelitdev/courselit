import React, { useEffect, useState } from "react";
import { TextEditor } from "@courselit/components-library";
import { Grid, InputAdornment, TextField } from "@mui/material";
import Settings from "./settings";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = ({ settings, onChange }: AboutWidgetProps) => {
    const [content, setContent] = useState(settings.text);
    const [padding, setPadding] = useState(settings.padding || 16);

    useEffect(() => {
        onChange({
            text: content,
            padding,
        });
    }, [content, padding]);

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <TextEditor
                    initialContent={content}
                    onChange={(state: any) => setContent(state)}
                    showToolbar={false}
                />
            </Grid>
            <Grid item>
                <TextField
                    type="number"
                    value={padding}
                    label="Padding"
                    onChange={(e) => setPadding(+e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">px</InputAdornment>
                        ),
                    }}
                    fullWidth
                />
            </Grid>
        </Grid>
    );
};

export default AdminWidget;
