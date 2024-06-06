import { MarkMap, TextHandler } from "@remirror/react";
import React, { FC } from "react";
import { RemirrorJSON } from "remirror";

export const CodeMirrorRenderer: FC<{
    node: RemirrorJSON;
    markMap: MarkMap;
}> = (props) => {
    const content = props.node.content;
    if (!content) {
        return null;
    }

    const children = content.map((node, ii) => {
        return <TextHandler key={ii} {...{ ...props, node }} />;
    });

    return (
        <pre
            style={{
                backgroundColor: "#111",
                color: "white",
                borderRadius: "8px",
                padding: "16px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
            }}
        >
            <code>{children}</code>
        </pre>
    );
};
