import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import { Box } from "@mui/material";
import Settings from "./settings";

const Widget = ({
    settings: { text, alignment, backgroundColor, color },
}: WidgetProps<Settings>) => {
    if (!text) return <></>;

    return (
        <Box
            sx={{
                p: 2,
                textAlign: alignment,
                backgroundColor,
                color,
            }}
        >
            <TextRenderer json={text} />
        </Box>
    );
};

export default Widget;
