import type { JSONContent, Extensions } from "@tiptap/core";

export type EditorJSONContent = JSONContent;
export type EditorExtensions = Extensions;

export interface ReactEditorProps {
    initialContent?: JSONContent | string | null;
    editable?: boolean;
    autoFocus?: boolean;
    placeholder?: string;
}
