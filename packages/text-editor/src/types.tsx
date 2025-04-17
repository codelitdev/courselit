import type { CreateEditorStateProps } from "remirror";
import type { RemirrorProps } from "@remirror/react";

export interface ReactEditorProps {
    stringHandler?: CreateEditorStateProps["stringHandler"];
    initialContent?: RemirrorProps["initialContent"];
    editable?: RemirrorProps["editable"];
    autoFocus?: RemirrorProps["autoFocus"];
    hooks?: RemirrorProps["hooks"];
    placeholder?: string;
}
