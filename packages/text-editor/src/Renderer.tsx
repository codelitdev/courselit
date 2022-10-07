import React from "react";
import {
    Callout,
    CodeBlock,
    createIFrameHandler,
    createLinkHandler,
    Doc,
    Heading,
    MarkMap,
    RemirrorRenderer,
    TextHandler,
    ThemeProvider,
} from "@remirror/react";
import { RemirrorJSON } from "@remirror/core-types";

const typeMap: MarkMap = {
    blockquote: "blockquote",
    bulletList: "ul",
    callout: Callout,
    codeBlock: CodeBlock,
    doc: Doc,
    hardBreak: "br",
    heading: Heading,
    horizontalRule: "hr",
    iframe: createIFrameHandler(),
    image: "img",
    listItem: "li",
    paragraph: "p",
    orderedList: "ol",
    text: TextHandler,
    taskList: "ul",
    taskListItem: "li",
};

const markMap: MarkMap = {
    italic: "em",
    bold: "strong",
    code: "code",
    link: createLinkHandler({ target: "_blank" }),
    underline: "u",
};

interface RendererProps {
    json: RemirrorJSON;
}

const Renderer = ({ json }: RendererProps): JSX.Element => {
    return (
        <ThemeProvider>
            <RemirrorRenderer
                json={json}
                typeMap={typeMap}
                markMap={markMap}
                skipUnknownTypes
            />
        </ThemeProvider>
    );
};

export default Renderer;
