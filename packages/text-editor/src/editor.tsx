"use client";

import React, {
    FC,
    PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { JSONContent } from "@tiptap/core";
import { generateText } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import emptyDoc from "./empty-doc";
import { createExtensions } from "./extensions";
import Toolbar from "./toolbar";
import BubbleMenu from "./bubble-menu";
import type { ReactEditorProps } from "./types";
import { uploadImageToMediaLit } from "./file-upload-extention";

export interface EditorProps {
    onChange: (json: JSONContent) => void;
    showToolbar?: boolean;
    editable?: boolean;
    refresh?: number;
    url: string;
    initialContent?: ReactEditorProps["initialContent"];
    placeholder?: string;
    autoFocus?: boolean;
    imageSizeLimit?: number;
    onError?: (...args: any[]) => void;
}

interface EditorType extends FC<PropsWithChildren<EditorProps>> {
    getPlainText: (doc: JSONContent) => string;
    emptyDoc: JSONContent;
}

const Editor: EditorType = Object.assign(
    ({
        initialContent,
        onChange,
        placeholder,
        children,
        showToolbar = true,
        editable = true,
        refresh,
        url,
        autoFocus,
        imageSizeLimit,
        onError,
    }) => {
        const [isUploading, setIsUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement | null>(null);
        const hasInteractedRef = useRef(false);
        const lastSerializedContentRef = useRef(
            JSON.stringify(initialContent ?? emptyDoc),
        );
        const refreshRef = useRef<EditorProps["refresh"]>(refresh);

        const extensions = useMemo(
            () => createExtensions({ placeholder }),
            [placeholder],
        );

        const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const editor = useEditor(
            {
                immediatelyRender: false,
                extensions,
                content: initialContent ?? emptyDoc,
                autofocus: autoFocus ? "end" : false,
                editable,
                editorProps: {
                    attributes: {
                        class: "tiptap-content",
                        "data-placeholder": placeholder ?? "",
                    },
                },
                onUpdate: ({ editor: instance }) => {
                    if (changeTimeoutRef.current) {
                        clearTimeout(changeTimeoutRef.current);
                    }

                    changeTimeoutRef.current = setTimeout(() => {
                        hasInteractedRef.current = true;
                        onChange(instance.getJSON());
                        changeTimeoutRef.current = null;
                    }, 1000);
                },
                onSelectionUpdate: ({ editor: instance }) => {
                    hasInteractedRef.current = true;
                },
            },
            [extensions],
        );
        useEffect(() => {
            return () => {
                if (changeTimeoutRef.current) {
                    clearTimeout(changeTimeoutRef.current);
                }
            };
        }, []);

        useEffect(() => {
            if (!editor) {
                return;
            }

            editor.setEditable(editable);
        }, [editor, editable]);

        useEffect(() => {
            if (!editor) {
                return;
            }

            const nextContent = initialContent ?? emptyDoc;
            const nextSerialized = JSON.stringify(nextContent);
            const refreshChanged = refreshRef.current !== refresh;

            if (refreshChanged) {
                refreshRef.current = refresh;
                hasInteractedRef.current = false;
                lastSerializedContentRef.current = nextSerialized;
                editor.commands.setContent(nextContent, {
                    emitUpdate: false,
                });
                return;
            }

            if (!hasInteractedRef.current) {
                if (lastSerializedContentRef.current !== nextSerialized) {
                    lastSerializedContentRef.current = nextSerialized;
                    editor.commands.setContent(nextContent, {
                        emitUpdate: false,
                    });
                }
                return;
            }

            lastSerializedContentRef.current = nextSerialized;
        }, [editor, initialContent, refresh]);

        const handleImageUpload = useCallback(
            async (file: File) => {
                try {
                    setIsUploading(true);
                    const result = await uploadImageToMediaLit({
                        url,
                        file,
                        fileSizeLimit: imageSizeLimit,
                        onError,
                    });
                    editor
                        ?.chain()
                        .focus()
                        .setImage({
                            src: result.src,
                            alt: result.fileName,
                            title: result.fileName,
                        })
                        .run();
                } catch (error) {
                    console.error("Image upload failed", error);
                } finally {
                    setIsUploading(false);
                }
            },
            [editor, url],
        );

        const handleSelectFile = useCallback(
            (event: React.ChangeEvent<HTMLInputElement>) => {
                const files = event.target.files;
                if (!files || files.length === 0) {
                    return;
                }

                const file = files[0];
                void handleImageUpload(file);
                event.target.value = "";
            },
            [handleImageUpload],
        );

        const openFileDialog = useCallback(() => {
            fileInputRef.current?.click();
        }, []);

        if (typeof window === "undefined") {
            return <></>;
        }

        return (
            <div className="tiptap-editor flex flex-col gap-4 border">
                {editable && showToolbar && (
                    <div
                        className="sticky top-0 bg-background"
                        style={{
                            zIndex: 1,
                        }}
                    >
                        <Toolbar
                            editor={editor}
                            onRequestImageUpload={openFileDialog}
                            isUploadingImage={isUploading}
                        />
                    </div>
                )}
                <div className="flex w-full justify-center">
                    <div className="flex w-full max-w-3xl flex-col gap-4">
                        <EditorContent
                            editor={editor}
                            className="min-h-[200px]"
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleSelectFile}
                        />
                        {children}
                        {editor && <BubbleMenu editor={editor} />}
                    </div>
                </div>
            </div>
        );
    },
    {
        getPlainText: (doc: JSONContent) =>
            generateText(doc || emptyDoc, createExtensions()),
        emptyDoc,
    },
) as EditorType;

export default Editor;
