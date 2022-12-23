import { languages } from "@codemirror/language-data";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { MarkMap, TextHandler } from "@remirror/react";
import { basicSetup, EditorView } from "codemirror";
import React, {
    createRef,
    FC,
    ReactNode,
    useCallback,
    useEffect,
    useState,
} from "react";
import { RemirrorJSON } from "remirror";

const style = {};

export const CodeMirrorRenderer: FC<{
    node: RemirrorJSON;
    markMap: MarkMap;
}> = (props) => {
    // const [element, setElement] = useState<HTMLElement>();

    const content = props.node.content;
    if (!content) {
        return null;
    }

    // const ref = useCallback((node: HTMLElement | null) => {
    //     if (!node) return;

    //     setElement(node);
    // }, [])

    // useEffect(() => {
    //     if (!element) return;

    //     const children = content.map((node, ii) => {
    //         return node;
    //     })
    //     console.log(content);

    //     const state = EditorState.create({
    //         doc: (props.node as any).textContent,
    //         extensions: [basicSetup, oneDark, EditorState.readOnly.of(true)]
    //     })

    //     const view = new EditorView({
    //         state,
    //         parent: element
    //     })

    //     return () => view.destroy();
    // }, [element])
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
                width: "calc(100vw - 32px)",
                // whiteSpace: 'pre-wrap'
            }}
        >
            <code>{children}</code>
        </pre>
    );
};
