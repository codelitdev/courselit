import React, { ChangeEvent, useEffect, useState } from "react";
import { RichText as TextEditor } from "@courselit/components-library";
import { Grid, InputAdornment, TextField } from "@mui/material";
import Settings from "./settings";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = ({ settings, onChange }: AboutWidgetProps) => {
    const [editorState, setEditorState] = useState(
        settings.text
            ? TextEditor.hydrate({ data: settings.text })
            : TextEditor.emptyState()
    );
    const [padding, setPadding] = useState(settings.padding || 0);

    useEffect(() => {
        onChange({
            text: TextEditor.stringify(editorState),
            padding,
        });
    }, [editorState, padding]);

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <TextEditor
                    initialContentState={editorState}
                    onChange={(editorState: any) => setEditorState(editorState)}
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
