import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import { Box } from "@mui/material";
import Settings from "./settings";

const Widget = ({ settings: { text, padding } }: WidgetProps<Settings>) => {
    if (!text) return <></>;

    return (
        <Box
            sx={{
                p: padding ? `${padding || 0}px` : 2,
            }}
        >
            <TextRenderer json={text} />
        </Box>
    );
};

export default Widget;
