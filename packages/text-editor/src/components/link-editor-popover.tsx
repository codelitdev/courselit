"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, Trash2, X } from "lucide-react";

interface LinkEditorPopoverProps {
    editor: Editor;
    onClose: () => void;
    variant?: "panel" | "inline";
    containerRef?: React.MutableRefObject<HTMLDivElement | null>;
}

const LinkEditorPopover = ({
    editor,
    onClose,
    variant = "panel",
    containerRef,
}: LinkEditorPopoverProps): JSX.Element => {
    const [linkValue, setLinkValue] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const localContainerRef = useRef<HTMLDivElement | null>(null);

    const assignContainerRef = (node: HTMLDivElement | null) => {
        localContainerRef.current = node;
        if (containerRef) {
            containerRef.current = node;
        }
    };

    useEffect(() => {
        const current = editor.getAttributes("link").href as string | undefined;
        setLinkValue(current ?? "");
    }, [editor]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 20);

        return () => window.clearTimeout(timer);
    }, []);

    const applyLink = () => {
        const value = linkValue.trim();
        if (!value) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
            editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: value })
                .run();
        }

        onClose();
    };

    const removeLink = () => {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        onClose();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        }
    };

    if (variant === "inline") {
        return (
            <div
                ref={assignContainerRef}
                className="flex items-center gap-2 rounded-md border border-border bg-background p-2 shadow"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="url"
                    placeholder="https://example.com"
                    value={linkValue}
                    onChange={(event) => setLinkValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-48 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <button
                    type="button"
                    aria-label="Cancel link editing"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    aria-label="Remove link"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
                    onClick={removeLink}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    aria-label="Apply link"
                    className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                    onClick={applyLink}
                >
                    <Check className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div
            ref={assignContainerRef}
            className="absolute left-2 top-full z-20 mt-2 w-full max-w-sm rounded-md border border-border bg-background p-3 shadow-lg"
        >
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Link URL
                </label>
                <input
                    ref={inputRef}
                    type="url"
                    placeholder="https://example.com"
                    value={linkValue}
                    onChange={(event) => setLinkValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted"
                        onClick={removeLink}
                    >
                        <Trash2 className="h-4 w-4" />
                        Remove
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        onClick={applyLink}
                    >
                        <Check className="h-4 w-4" />
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkEditorPopover;
