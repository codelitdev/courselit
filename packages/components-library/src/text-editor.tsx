import * as React from "react";
import { WysiwygEditor as TextEditor } from "@courselit/text-editor";
export { emptyDoc } from "@courselit/text-editor";

export interface WysiwygEditorProps {
    initialContent?: any;
    onChange: (...args: any[]) => void;
    showToolbar?: boolean;
    editable?: boolean;
    refresh?: number;
}

export default function Editor({
    initialContent,
    onChange,
    showToolbar,
    editable,
    refresh,
}: WysiwygEditorProps) {
    return (
        <TextEditor
            initialContent={initialContent}
            onChange={onChange}
            showToolbar={showToolbar}
            editable={editable}
            refresh={refresh}
            fontFamily={"inherit"}
        />
    );
}
