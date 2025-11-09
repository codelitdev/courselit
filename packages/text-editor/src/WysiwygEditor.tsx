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
import type { Editor, JSONContent } from "@tiptap/core";
import { generateText } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import emptyDoc from "./empty-doc";
import { createExtensions } from "./extensions";
import Toolbar from "./Toolbar";
import BubbleMenu from "./BubbleMenu";
import type { ReactEditorProps } from "./types";
import {
    deleteMediaFromServer,
    MediaDeleteType,
    uploadImageToMediaLit,
} from "./file-upload-extention";

const collectMediaIdsFromJSON = (content?: JSONContent | null): Set<string> => {
    const mediaIds = new Set<string>();

    const traverse = (node?: JSONContent | null) => {
        if (!node) {
            return;
        }

        if (node.type === "image" && node.attrs) {
            const mediaId = (node.attrs as Record<string, unknown>).mediaId;
            if (typeof mediaId === "string" && mediaId.trim().length > 0) {
                mediaIds.add(mediaId);
            }
        }

        if (Array.isArray(node.content)) {
            node.content.forEach((child) => traverse(child));
        }
    };

    traverse(content);

    return mediaIds;
};

export interface WysiwygEditorProps {
    onChange: (json: JSONContent) => void;
    showToolbar?: boolean;
    editable?: boolean;
    refresh?: number;
    fontFamily?: string;
    url: string;
    initialContent?: ReactEditorProps["initialContent"];
    placeholder?: string;
    autoFocus?: boolean;
    mediaType?: MediaDeleteType;
}

interface WysiwygEditorType extends FC<PropsWithChildren<WysiwygEditorProps>> {
    getPlainText: (doc: JSONContent) => string;
    emptyDoc: JSONContent;
}

const WysiwygEditor: WysiwygEditorType = Object.assign(
    ({
        initialContent,
        onChange,
        placeholder,
        children,
        showToolbar = true,
        editable = true,
        refresh,
        fontFamily,
        url,
        autoFocus,
        mediaType,
    }) => {
        const [isUploading, setIsUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement | null>(null);
        const hasInteractedRef = useRef(false);
        const lastSerializedContentRef = useRef(
            JSON.stringify(initialContent ?? emptyDoc),
        );
        const refreshRef = useRef<WysiwygEditorProps["refresh"]>(refresh);
        const previousMediaIdsRef = useRef<Set<string>>(
            collectMediaIdsFromJSON(initialContent ?? emptyDoc),
        );
        const pendingDeletionIdsRef = useRef<Set<string>>(new Set());
        const mediaTypeToUse = mediaType ?? null;

        const extensions = useMemo(
            () => createExtensions({ placeholder }),
            [placeholder],
        );

        const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const queueMediaDeletion = useCallback(
            (ids: string[]) => {
                if (!url || !mediaTypeToUse || ids.length === 0) {
                    return;
                }

                ids.forEach((id) => {
                    if (!id || pendingDeletionIdsRef.current.has(id)) {
                        return;
                    }

                    pendingDeletionIdsRef.current.add(id);

                    deleteMediaFromServer(url, id, mediaTypeToUse)
                        .catch((error) => {
                            console.error(
                                `Failed to delete media asset ${id}`,
                                error,
                            );
                        })
                        .finally(() => {
                            pendingDeletionIdsRef.current.delete(id);
                        });
                });
            },
            [mediaTypeToUse, url],
        );

        const handleRemovedImages = useCallback(
            (instance: Editor) => {
                const currentMediaIds = collectMediaIdsFromJSON(
                    instance.getJSON(),
                );
                const previousMediaIds = previousMediaIdsRef.current;
                const removedIds: string[] = [];

                previousMediaIds.forEach((id) => {
                    if (!currentMediaIds.has(id)) {
                        removedIds.push(id);
                    }
                });

                if (removedIds.length > 0) {
                    queueMediaDeletion(removedIds);
                }

                previousMediaIdsRef.current = currentMediaIds;
            },
            [queueMediaDeletion],
        );

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
                    }, 300);

                    handleRemovedImages(instance);
                },
                onSelectionUpdate: ({ editor: instance }) => {
                    hasInteractedRef.current = true;
                },
            },
            [extensions],
        );

        useEffect(() => {
            if (!editor) {
                return;
            }

            previousMediaIdsRef.current = collectMediaIdsFromJSON(
                editor.getJSON(),
            );
        }, [editor]);
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
                previousMediaIdsRef.current =
                    collectMediaIdsFromJSON(nextContent);
                return;
            }

            if (!hasInteractedRef.current) {
                if (lastSerializedContentRef.current !== nextSerialized) {
                    lastSerializedContentRef.current = nextSerialized;
                    editor.commands.setContent(nextContent, {
                        emitUpdate: false,
                    });
                    previousMediaIdsRef.current =
                        collectMediaIdsFromJSON(nextContent);
                }
                return;
            }

            lastSerializedContentRef.current = nextSerialized;
        }, [editor, initialContent, refresh]);

        const handleImageUpload = useCallback(
            async (file: File) => {
                try {
                    setIsUploading(true);
                    const result = await uploadImageToMediaLit(url, file);
                    const chain = editor?.chain().focus().setImage({
                        src: result.src,
                        alt: result.fileName,
                        title: result.fileName,
                    });

                    if (!chain) {
                        return;
                    }

                    const attributesToApply: Record<string, string> = {};

                    if (result.mediaId) {
                        attributesToApply.mediaId = result.mediaId;
                    }

                    if (result.fileName) {
                        attributesToApply.originalFileName = result.fileName;
                    }

                    if (Object.keys(attributesToApply).length > 0) {
                        chain.updateAttributes("image", attributesToApply);
                    }

                    chain.run();
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
            <div
                className="tiptap-editor flex flex-col gap-2"
                style={{
                    fontFamily,
                }}
            >
                {editable && showToolbar && (
                    <div
                        className="sticky top-0 z-10 bg-background"
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                        }}
                    >
                        <Toolbar
                            editor={editor}
                            onRequestImageUpload={openFileDialog}
                            isUploadingImage={isUploading}
                        />
                    </div>
                )}
                <div className="rounded-md border border-border">
                    {editor && <BubbleMenu editor={editor} />}
                    <EditorContent
                        editor={editor}
                        className="min-h-[200px] px-4 py-3"
                    />
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectFile}
                />
                {children}
            </div>
        );
    },
    {
        getPlainText: (doc: JSONContent) =>
            generateText(doc || emptyDoc, createExtensions()),
        emptyDoc,
    },
) as WysiwygEditorType;

export default WysiwygEditor;
