import { useState } from "react";
import TextEditor2, { Renderer } from "@courselit/text-editor";

export default function TextEditor() {
    const [state, setState] = useState({
        type: "doc",
        content: [
            {
                type: "paragraph",
                attrs: { dir: null, ignoreBidiAutoUpdate: null },
                content: [{ type: "text", text: "Lol Hard!" }],
            },
        ],
    });

    return (
        <>
            <TextEditor2
                onChange={(state: any) => {
                    setState(state);
                }}
                initialContent={state}
            />
            <Renderer doc={state} />
        </>
    );
}
