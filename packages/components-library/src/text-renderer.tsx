import React from "react";
import { Renderer } from "@courselit/text-editor";

interface RendererProps {
    json: any;
}

export default function TextRenderer({ json }: RendererProps) {
    return (
        <div className="text-editor">
            <Renderer json={json} fontFamily={"inherit"} />
        </div>
    );
}
