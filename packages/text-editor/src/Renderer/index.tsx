"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import emptyDoc from "../empty-doc";
import { createExtensions } from "../extensions";

interface RendererProps {
    json?: JSONContent | null;
    fontFamily?: string;
    className?: string;
}

const Renderer = ({ json, fontFamily, className }: RendererProps) => {
    const serializedContentRef = useRef(JSON.stringify(json ?? emptyDoc));

    const extensions = useMemo(() => createExtensions(), []);

    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions,
            content: json ?? emptyDoc,
            editable: false,
        },
        [extensions],
    );

    useEffect(() => {
        if (!editor) {
            return;
        }

        editor.setEditable(false);
    }, [editor]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const nextSerialized = JSON.stringify(json ?? emptyDoc);

        if (serializedContentRef.current !== nextSerialized) {
            serializedContentRef.current = nextSerialized;
            editor.commands.setContent(json ?? emptyDoc, {
                emitUpdate: false,
            });
        }
    }, [editor, json]);

    const combinedClassName = ["tiptap-renderer", className]
        .filter(Boolean)
        .join(" ");

    if (!editor) {
        return null;
    }

    return (
        <div
            className={combinedClassName}
            style={{
                fontFamily,
            }}
        >
            <EditorContent editor={editor} />
        </div>
    );
};

export default Renderer;
