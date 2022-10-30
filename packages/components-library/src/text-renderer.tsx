import * as React from "react";
import { Renderer } from "@courselit/text-editor";
import { useTheme } from "@mui/material";

interface RendererProps {
    json: any;
}

export default function TextRenderer({ json }: RendererProps) {
    const theme = useTheme();

    return <Renderer json={json} fontFamily={theme.typography.fontFamily} />;
}
