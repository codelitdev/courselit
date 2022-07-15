import React from "react";
import { RichText as TextEditor, Section } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import { Box } from "@mui/material";
import Settings from "./settings";

const Widget = ({ settings: { text, padding } }: WidgetProps<Settings>) => {
    return (
        <Box
            sx={{
                p: padding ? `${padding || 0}px` : 2,
            }}
        >
            <TextEditor
                initialContentState={
                    text
                        ? TextEditor.hydrate({ data: text })
                        : TextEditor.emptyState()
                }
                readOnly={true}
            />
        </Box>
    );
};

export default Widget;
