import * as React from "react";
import { Renderer } from "@courselit/text-editor";

interface RendererProps {
    json: any;
}

export default function TextRenderer({ json }: RendererProps) {
    return <Renderer json={json} fontFamily={"inherit"} />;
}
