import React from "react";
import { WysiwygEditor as TextEditor } from "@courselit/text-editor";
import type { MediaDeleteType } from "@courselit/text-editor";
export { emptyDoc } from "@courselit/text-editor";

export interface WysiwygEditorProps {
    initialContent?: any;
    onChange: (...args: any[]) => void;
    showToolbar?: boolean;
    editable?: boolean;
    refresh?: number;
    url: string;
    placeholder?: string;
    mediaType?: MediaDeleteType;
}

export default function Editor({
    initialContent,
    onChange,
    showToolbar,
    editable,
    refresh,
    url,
    placeholder,
    mediaType,
}: WysiwygEditorProps) {
    return (
        <div className="text-editor">
            <TextEditor
                initialContent={initialContent}
                onChange={onChange}
                showToolbar={showToolbar}
                editable={editable}
                refresh={refresh}
                fontFamily={"inherit"}
                url={url}
                placeholder={placeholder}
                mediaType={mediaType}
            />
        </div>
    );
}
