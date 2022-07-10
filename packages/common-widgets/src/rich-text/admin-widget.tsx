import * as React from "react";
import { RichText as TextEditor } from "@courselit/components-library";
import { Grid } from "@mui/material";
import Settings from "./settings";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = ({ settings, onChange }: AboutWidgetProps) => {
    const [editorState, setEditorState] = React.useState(
        settings.text
            ? TextEditor.hydrate({ data: settings.text })
            : TextEditor.emptyState()
    );

    const onChangeData = (editorState: any) => {
        setEditorState(editorState);
        onChange({
            text: TextEditor.stringify(editorState),
        });
    };

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <TextEditor
                    initialContentState={editorState}
                    onChange={onChangeData}
                />
            </Grid>
        </Grid>
    );
};

export default AdminWidget;
