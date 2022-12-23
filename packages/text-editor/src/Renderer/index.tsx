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
import { CodeMirrorRenderer } from "./code-mirror-renderer";

const typeMap: MarkMap = {
    blockquote: "blockquote",
    bulletList: "ul",
    callout: Callout,
    codeBlock: CodeBlock,
    codeMirror: CodeMirrorRenderer,
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
    fontFamily?: string;
}

const Renderer = ({ json, fontFamily }: RendererProps): JSX.Element => {
    const theme = {
        fontFamily: {
            default: fontFamily,
        },
    };

    return (
        <ThemeProvider theme={theme}>
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
