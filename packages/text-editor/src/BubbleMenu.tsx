import React, { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { BubbleMenu as TipTapBubbleMenu } from "@tiptap/react/menus";
import {
    Bold,
    Code,
    Italic,
    Link as LinkIcon,
    Strikethrough,
    Underline,
} from "lucide-react";
import LinkEditorPopover from "./components/LinkEditorPopover";

interface BubbleMenuProps {
    editor: Editor;
}

const buttonBase =
    "inline-flex h-8 w-8 items-center justify-center rounded text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function InlineButton({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active?: boolean;
    onClick: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`${buttonBase} ${
                active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-transparent hover:bg-muted"
            }`}
            onClick={onClick}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

const InlineBubbleMenu = ({ editor }: BubbleMenuProps): JSX.Element | null => {
    const [isLinkEditing, setIsLinkEditing] = useState(false);

    const openLinkEditor = useCallback(() => {
        setIsLinkEditing((prev) => !prev);
    }, []);

    useEffect(() => {
        const handleSelectionUpdate = () => {
            setIsLinkEditing(false);
        };

        editor.on("selectionUpdate", handleSelectionUpdate);

        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <TipTapBubbleMenu
            editor={editor}
            className="bubble-menu rounded-md border border-border bg-background p-2 shadow-xl"
        >
            <div className="flex items-center gap-1">
                <InlineButton
                    icon={Bold}
                    label="Bold"
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                />
                <InlineButton
                    icon={Italic}
                    label="Italic"
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                />
                <InlineButton
                    icon={Underline}
                    label="Underline"
                    active={editor.isActive("underline")}
                    onClick={() =>
                        editor.chain().focus().toggleMark("underline").run()
                    }
                />
                <InlineButton
                    icon={Strikethrough}
                    label="Strikethrough"
                    active={editor.isActive("strike")}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                />
                <InlineButton
                    icon={Code}
                    label="Inline code"
                    active={editor.isActive("code")}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                />
                <InlineButton
                    icon={LinkIcon}
                    label="Insert link"
                    active={editor.isActive("link")}
                    onClick={openLinkEditor}
                />
            </div>
            {isLinkEditing && (
                <LinkEditorPopover
                    editor={editor}
                    onClose={() => setIsLinkEditing(false)}
                    variant="inline"
                />
            )}
        </TipTapBubbleMenu>
    );
};

export default InlineBubbleMenu;
