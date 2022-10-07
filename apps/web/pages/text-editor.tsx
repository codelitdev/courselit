import { useState } from "react";
import TextEditor2, { Renderer } from "@courselit/text-editor";

const doc1 = {
    type: "doc",
    content: [
        {
            type: "paragraph",
            attrs: { dir: null, ignoreBidiAutoUpdate: null },
            content: [{ type: "text", text: "Lol Hard!" }],
        },
    ],
};

const doc2 = {
    type: "doc",
    content: [
        {
            type: "paragraph",
            attrs: { dir: null, ignoreBidiAutoUpdate: null },
            content: [{ type: "text", text: "Lol At All?" }],
        },
    ],
};

export default function TextEditor() {
    const [state, setState] = useState(doc2);
    const [currentDoc, setCurrentDoc] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const toggleDoc = () => {
        setState(currentDoc ? doc2 : doc1);
        setCurrentDoc(!currentDoc);
        setRefresh(refresh + 1);
    };

    return (
        <>
            <button onClick={toggleDoc}>Toggle</button>
            <TextEditor2
                onChange={(state: any) => {
                    setState(state);
                }}
                initialContent={state}
                refresh={refresh}
            />
            <Renderer json={state} />
        </>
    );
}
