import React from "react";
import { RichText as TextEditor, Section } from "@courselit/components-library";
import { Grid } from "@mui/material";
import type { WidgetProps } from "@courselit/common-models";

const Widget = (props: WidgetProps) => {
    const { settings } = props;

    return (
        <Grid item xs={12}>
            <Section>
                <TextEditor
                    initialContentState={
                        settings && settings.text
                            ? TextEditor.hydrate({ data: settings.text })
                            : TextEditor.emptyState()
                    }
                    readOnly={true}
                />
            </Section>
        </Grid>
    );
};

export default Widget;
