import React from "react";
import { RichText as TextEditor, Section } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import { Box } from "@mui/material";

const Widget = (props: WidgetProps) => {
    const { settings } = props;
    console.log(settings);

    return (
        <Box
            sx={{
                p: `${settings.padding || 0}px`,
            }}
        >
            <TextEditor
                initialContentState={
                    settings && settings.text
                        ? TextEditor.hydrate({ data: settings.text })
                        : TextEditor.emptyState()
                }
                readOnly={true}
            />
        </Box>
    );
};

export default Widget;
