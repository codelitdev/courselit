import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Level } from "@tiptap/extension-heading";
import {
    Bold,
    Code,
    CodeSquare,
    Heading1,
    Heading2,
    Heading3,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List as ListIcon,
    ListOrdered,
    Minus,
    Quote,
    Redo2,
    SquarePen,
    Strikethrough,
    Table as TableIcon,
    Trash2,
    Underline,
    Undo2,
} from "lucide-react";
import LinkEditorPopover from "./components/link-editor-popover.js";

interface ToolbarProps {
    editor: Editor | null;
    onRequestImageUpload: () => void;
    isUploadingImage?: boolean;
}

type PopoverType = "link" | "table" | null;

const iconButtonBase =
    "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

function IconButton({
    icon: Icon,
    label,
    active,
    disabled,
    onClick,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`${iconButtonBase} ${
                active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-transparent hover:bg-muted"
            }`}
            disabled={disabled}
            onClick={onClick}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

const headingButtons: Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    level?: Level;
}> = [
    { label: "Paragraph", value: "paragraph", icon: SquarePen },
    { label: "Heading 1", value: "h1", icon: Heading1, level: 1 },
    { label: "Heading 2", value: "h2", icon: Heading2, level: 2 },
    { label: "Heading 3", value: "h3", icon: Heading3, level: 3 },
];

const Toolbar = ({
    editor,
    onRequestImageUpload,
    isUploadingImage,
}: ToolbarProps): JSX.Element | null => {
    const [activePopover, setActivePopover] = useState<PopoverType>(null);

    const popoverRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!activePopover) {
            return undefined;
        }

        const handleClick = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node)
            ) {
                setActivePopover(null);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setActivePopover(null);
            }
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [activePopover]);

    if (!editor) {
        return null;
    }

    const togglePopover = (type: PopoverType, onBeforeOpen?: () => void) => {
        setActivePopover((current) => {
            if (current === type) {
                return null;
            }

            onBeforeOpen?.();
            return type;
        });
    };

    const toggleTablePopover = () => {
        togglePopover("table");
    };

    const insertTable = () => {
        editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        setActivePopover(null);
    };

    const addRowAfter = () => {
        editor.chain().focus().addRowAfter().run();
        setActivePopover(null);
    };

    const deleteRow = () => {
        editor.chain().focus().deleteRow().run();
        setActivePopover(null);
    };

    const addColumnAfter = () => {
        editor.chain().focus().addColumnAfter().run();
        setActivePopover(null);
    };

    const deleteColumn = () => {
        editor.chain().focus().deleteColumn().run();
        setActivePopover(null);
    };

    const deleteTable = () => {
        editor.chain().focus().deleteTable().run();
        setActivePopover(null);
    };

    const canInsertTable = editor
        .can()
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    const canAddRow = editor.can().chain().focus().addRowAfter().run();
    const canDeleteRow = editor.can().chain().focus().deleteRow().run();
    const canAddColumn = editor.can().chain().focus().addColumnAfter().run();
    const canDeleteColumn = editor.can().chain().focus().deleteColumn().run();
    const canDeleteTable = editor.can().chain().focus().deleteTable().run();

    return (
        <div className="relative w-full">
            <div className="overflow-x-auto">
                <div className="flex w-full flex-wrap justify-center items-center gap-2 border-b border-border bg-background px-4 py-2">
                    <div className="flex items-center gap-1">
                        <IconButton
                            icon={Undo2}
                            label="Undo"
                            disabled={!editor.can().undo()}
                            onClick={() => editor.chain().focus().undo().run()}
                        />
                        <IconButton
                            icon={Redo2}
                            label="Redo"
                            disabled={!editor.can().redo()}
                            onClick={() => editor.chain().focus().redo().run()}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        {headingButtons.map((button) => (
                            <IconButton
                                key={button.value}
                                icon={button.icon}
                                label={button.label}
                                active={
                                    button.value === "paragraph"
                                        ? editor.isActive("paragraph")
                                        : editor.isActive("heading", {
                                              level: button.level,
                                          })
                                }
                                onClick={() => {
                                    const chain = editor.chain().focus();
                                    if (button.level) {
                                        chain
                                            .toggleHeading({
                                                level: button.level,
                                            })
                                            .run();
                                    } else {
                                        chain.setParagraph().run();
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <IconButton
                            icon={Bold}
                            label="Bold"
                            active={editor.isActive("bold")}
                            onClick={() =>
                                editor.chain().focus().toggleBold().run()
                            }
                        />
                        <IconButton
                            icon={Italic}
                            label="Italic"
                            active={editor.isActive("italic")}
                            onClick={() =>
                                editor.chain().focus().toggleItalic().run()
                            }
                        />
                        <IconButton
                            icon={Underline}
                            label="Underline"
                            active={editor.isActive("underline")}
                            onClick={() =>
                                editor
                                    .chain()
                                    .focus()
                                    .toggleMark("underline")
                                    .run()
                            }
                        />
                        <IconButton
                            icon={Strikethrough}
                            label="Strikethrough"
                            active={editor.isActive("strike")}
                            onClick={() =>
                                editor.chain().focus().toggleStrike().run()
                            }
                        />
                        <IconButton
                            icon={Code}
                            label="Inline code"
                            active={editor.isActive("code")}
                            onClick={() =>
                                editor.chain().focus().toggleCode().run()
                            }
                        />
                        <IconButton
                            icon={LinkIcon}
                            label="Insert link"
                            active={editor.isActive("link")}
                            onClick={() => togglePopover("link")}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <IconButton
                            icon={ListIcon}
                            label="Bullet list"
                            active={editor.isActive("bulletList")}
                            onClick={() =>
                                editor.chain().focus().toggleBulletList().run()
                            }
                        />
                        <IconButton
                            icon={ListOrdered}
                            label="Numbered list"
                            active={editor.isActive("orderedList")}
                            onClick={() =>
                                editor.chain().focus().toggleOrderedList().run()
                            }
                        />
                        <IconButton
                            icon={Quote}
                            label="Blockquote"
                            active={editor.isActive("blockquote")}
                            onClick={() =>
                                editor.chain().focus().toggleBlockquote().run()
                            }
                        />
                        <IconButton
                            icon={Minus}
                            label="Horizontal rule"
                            onClick={() =>
                                editor.chain().focus().setHorizontalRule().run()
                            }
                        />
                        <IconButton
                            icon={CodeSquare}
                            label="Code block"
                            active={editor.isActive("codeBlock")}
                            onClick={() =>
                                editor.chain().focus().toggleCodeBlock().run()
                            }
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <IconButton
                            icon={TableIcon}
                            label="Table options"
                            active={editor.isActive("table")}
                            onClick={toggleTablePopover}
                        />
                        <IconButton
                            icon={ImageIcon}
                            label="Insert image"
                            disabled={isUploadingImage}
                            onClick={onRequestImageUpload}
                        />
                    </div>
                </div>
            </div>

            {activePopover === "link" && (
                <LinkEditorPopover
                    editor={editor}
                    onClose={() => setActivePopover(null)}
                    containerRef={popoverRef}
                />
            )}

            {activePopover === "table" && (
                <div
                    ref={popoverRef}
                    className="absolute left-2 top-full z-20 mt-2 w-56 rounded-md border border-border bg-background p-2 shadow-lg"
                >
                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={insertTable}
                            disabled={!canInsertTable}
                        >
                            <span>Create 3×3 table</span>
                            <TableIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={addRowAfter}
                            disabled={!canAddRow}
                        >
                            <span>Add row</span>
                            <ListIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={deleteRow}
                            disabled={!canDeleteRow}
                        >
                            <span>Delete row</span>
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={addColumnAfter}
                            disabled={!canAddColumn}
                        >
                            <span>Add column</span>
                            <ListOrdered className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={deleteColumn}
                            disabled={!canDeleteColumn}
                        >
                            <span>Delete column</span>
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            onClick={deleteTable}
                            disabled={!canDeleteTable}
                        >
                            <span>Remove table</span>
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
