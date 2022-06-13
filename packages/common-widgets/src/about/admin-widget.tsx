import * as React from "react";
import { RichText as TextEditor } from "@courselit/components-library";
import { Grid } from "@mui/material";
import Settings from "./settings";
import type { Address, WidgetProps } from "@courselit/common-models";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = (props: AboutWidgetProps) => {
    const { onChange, settings } = props;

    const onChangeData = (editorState: any) => {
        onChange({
            text: TextEditor.stringify(editorState),
        });
    };

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <TextEditor
                    initialContentState={
                        settings.text
                            ? TextEditor.hydrate({ data: settings.text })
                            : TextEditor.emptyState()
                    }
                    onChange={onChangeData}
                />
            </Grid>
        </Grid>
    );
};

export default AdminWidget;
