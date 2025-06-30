import { useState, useCallback, useEffect } from "react";
import { BlockWrapper } from "./block-wrapper";
import { AddBlockButton } from "./add-block-button";
import { BlockSettingsPanel } from "./block-settings-panel";
import { EditorLayout } from "./layout/editor-layout";
import type { EmailBlock, Email, EmailStyle } from "../types/email-editor";
import type { BlockRegistry } from "../types/block-registry";
import { defaultEmail } from "../lib/default-email";
import "../index.css";

// Simple ID generator
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Helper function to deep merge objects
function deepMerge(target: any, source: any) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach((key) => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
}

function isObject(item: any) {
    return item && typeof item === "object" && !Array.isArray(item);
}

function getEmailWithBlockIds(email: Email): Email {
    return {
        style: email.style,
        meta: email.meta,
        content: email.content.map((block) => ({
            ...block,
            id: generateId(),
            settings: block.settings || {},
        })),
    };
}

function stripBlockIds(email: Email): Email {
    return {
        ...email,
        content: email.content.map((block) => ({ ...block, id: undefined })),
    };
}

function getDefaultSettingsForBlockType(
    blockType: string,
): Record<string, any> {
    // Common settings for all blocks
    const commonSettings = {
        backgroundColor: "transparent",
        foregroundColor: "#000000",
        paddingTop: "0px",
        paddingBottom: "0px",
    };

    switch (blockType) {
        case "text":
            return {
                ...commonSettings,
                content: "New text block",
            };
        case "separator":
            return {
                ...commonSettings,
                color: "#e2e8f0",
                thickness: "1px",
                style: "solid",
                marginY: "16px",
            };
        case "image":
            return {
                ...commonSettings,
                src: "",
                alt: "Image",
                alignment: "left",
                width: "auto",
                height: "auto",
                maxWidth: "100%",
                borderRadius: "0px",
                padding: "16px",
            };
        case "link":
            return {
                ...commonSettings,
                text: "Link Text",
                url: "#",
                alignment: "left",
                textColor: "#0284c7",
                fontSize: "16px",
                textDecoration: "underline",
                isButton: false,
            };
        default:
            return {} as Record<string, any>;
    }
}

interface EmailEditorProps {
    initialEmail?: Email;
    onChange?: (email: Email) => void;
    blockRegistry: BlockRegistry;
}

export function EmailEditor({
    initialEmail,
    onChange,
    blockRegistry,
}: EmailEditorProps) {
    const [email, setEmail] = useState<Email>(
        getEmailWithBlockIds(initialEmail || defaultEmail),
    );
    const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(true);

    // Update email when initialEmail prop changes
    useEffect(() => {
        if (initialEmail) {
            setEmail(getEmailWithBlockIds(initialEmail));
        }
    }, [initialEmail]);

    const updateEmail = useCallback(
        (newEmail: Email) => {
            setEmail(newEmail);
            if (onChange) {
                onChange(stripBlockIds(newEmail));
            }
        },
        [onChange],
    );

    const updateEmailStyle = useCallback(
        (styleUpdate: Partial<EmailStyle>) => {
            setEmail((prevEmail) => {
                const newEmail = {
                    ...prevEmail,
                    style: deepMerge(prevEmail.style, styleUpdate),
                };

                if (onChange) {
                    onChange(stripBlockIds(newEmail));
                }

                return newEmail;
            });
        },
        [onChange],
    );

    const addBlock = useCallback(
        (blockType: string, index: number) => {
            const newBlock: EmailBlock = {
                id: generateId(),
                blockType,
                settings: getDefaultSettingsForBlockType(blockType),
            };

            setEmail((prevEmail) => {
                const newEmail = {
                    ...prevEmail,
                    content: [
                        ...prevEmail.content.slice(0, index),
                        newBlock,
                        ...prevEmail.content.slice(index),
                    ],
                };

                if (onChange) {
                    onChange(stripBlockIds(newEmail));
                }

                return newEmail;
            });

            setSelectedBlockId(newBlock.id!);
        },
        [onChange],
    );

    const updateBlock = useCallback(
        (id: string, content: Partial<EmailBlock>) => {
            const newEmail = {
                ...email,
                content: email.content.map((block) =>
                    block.id === id ? { ...block, ...content } : block,
                ),
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(stripBlockIds(newEmail));
            }
        },
        [email, onChange],
    );

    // const updateBlockStyle = useCallback(
    //     (id: string, style: Partial<Style>) => {
    //         const newEmail = {
    //             ...email,
    //             content: email.content.map((block) => {
    //                 if (block.id === id) {
    //                     return {
    //                         ...block,
    //                         style: {
    //                             ...(block.style || {}),
    //                             ...style,
    //                         },
    //                     };
    //                 }
    //                 return block;
    //             }),
    //         };

    //         setEmail(newEmail);

    //         if (onChange) {
    //             onChange(stripBlockIds(newEmail));
    //         }
    //     },
    //     [email, onChange],
    // );

    const deleteBlock = useCallback(
        (id: string) => {
            setEmail((prevEmail) => {
                // Don't allow deleting if there's only one block left
                if (prevEmail.content.length <= 1) {
                    return prevEmail;
                }

                const newEmail = {
                    ...prevEmail,
                    content: prevEmail.content.filter(
                        (block) => block.id !== id,
                    ),
                };

                if (onChange) {
                    onChange(stripBlockIds(newEmail));
                }

                return newEmail;
            });

            // If the deleted block was selected, clear selection
            setSelectedBlockId((prevSelectedId) => {
                if (prevSelectedId === id) {
                    return null;
                }
                return prevSelectedId;
            });
        },
        [onChange],
    );

    const moveBlock = useCallback(
        (id: string, direction: "up" | "down") => {
            setEmail((prevEmail) => {
                const index = prevEmail.content.findIndex(
                    (block) => block.id === id,
                );
                if (
                    (direction === "up" && index === 0) ||
                    (direction === "down" &&
                        index === prevEmail.content.length - 1)
                ) {
                    return prevEmail;
                }

                const newContent = [...prevEmail.content];
                const [movedBlock] = newContent.splice(index, 1);
                newContent.splice(
                    direction === "up" ? index - 1 : index + 1,
                    0,
                    movedBlock,
                );

                const newEmail = {
                    ...prevEmail,
                    content: newContent,
                };

                if (onChange) {
                    onChange(stripBlockIds(newEmail));
                }

                return newEmail;
            });

            // Set the moving block ID to trigger animation
            setMovingBlockId(id);

            // Clear the moving block ID after animation completes
            setTimeout(() => {
                setMovingBlockId(null);
            }, 350);
        },
        [onChange],
    );

    const duplicateBlock = useCallback(
        (id: string) => {
            setEmail((prevEmail) => {
                const blockToDuplicate = prevEmail.content.find(
                    (block) => block.id === id,
                );
                if (!blockToDuplicate) return prevEmail;

                const index = prevEmail.content.findIndex(
                    (block) => block.id === id,
                );
                const duplicatedBlock = {
                    ...blockToDuplicate,
                    id: generateId(),
                };

                const newContent = [...prevEmail.content];
                newContent.splice(index + 1, 0, duplicatedBlock);

                const newEmail = {
                    ...prevEmail,
                    content: newContent,
                };

                if (onChange) {
                    onChange(stripBlockIds(newEmail));
                }

                // Set the selection immediately after creating the duplicated block
                setSelectedBlockId(duplicatedBlock.id!);

                return newEmail;
            });
        },
        [onChange],
    );

    // Separate first, middle, and last blocks
    const [first, ...remaining] = email.content;
    const last = remaining.pop();
    const middleBlocks = remaining;

    // Email editor content - mirroring the HTML email structure
    const editorContent = (
        <div className="email-html">
            {/* Body equivalent - Apply body styles here */}
            <div
                className="email-body"
                style={{
                    backgroundColor: email.style.colors.background,
                    color: email.style.colors.foreground,
                    paddingTop: email.style.structure.page.marginY,
                    paddingBottom: email.style.structure.page.marginY,
                    fontFamily: email.style.typography.text.fontFamily,
                }}
            >
                {/* Container equivalent - Apply container styles here */}
                <div
                    className="email-container mx-auto"
                    style={{
                        width: email.style.structure.page.width,
                        margin: `0px auto`,
                        backgroundColor: email.style.structure.page.background,
                        color:
                            email.style.structure.page.foreground ||
                            email.style.colors.foreground,
                        maxWidth: "800px",
                        borderWidth: email.style.structure.page.borderWidth,
                        borderStyle: email.style.structure.page.borderStyle,
                        borderColor: email.style.colors.border,
                        borderRadius: email.style.structure.page.borderRadius,
                        overflow: "hidden",
                    }}
                >
                    {email.content.length === 0 && (
                        <div className="p-4 text-center">
                            <p className="mb-4 text-gray-500">
                                Your email is empty.
                            </p>
                            <AddBlockButton
                                position="below"
                                index={0}
                                addBlock={addBlock}
                                blockRegistry={blockRegistry}
                            />
                        </div>
                    )}

                    <div>
                        {/* First Block - Fixed */}
                        {first && (
                            <BlockWrapper
                                key={first.id}
                                block={first as Required<EmailBlock>}
                                index={0}
                                isFirst={true}
                                isLast={false}
                                isFixed={true}
                                style={email.style}
                                blockRegistry={blockRegistry}
                                selectedBlockId={selectedBlockId}
                                setSelectedBlockId={setSelectedBlockId}
                                deleteBlock={deleteBlock}
                                moveBlock={moveBlock}
                                duplicateBlock={duplicateBlock}
                                movingBlockId={movingBlockId}
                                addBlock={addBlock}
                                totalBlocks={email.content.length}
                            />
                        )}

                        {/* Middle Blocks - Movable */}
                        {middleBlocks.map(
                            (block: EmailBlock, index: number) => (
                                <BlockWrapper
                                    key={block.id}
                                    block={block as Required<EmailBlock>}
                                    index={index + 1}
                                    isFirst={false}
                                    isLast={false}
                                    isFixed={false}
                                    style={email.style}
                                    blockRegistry={blockRegistry}
                                    selectedBlockId={selectedBlockId}
                                    setSelectedBlockId={setSelectedBlockId}
                                    deleteBlock={deleteBlock}
                                    moveBlock={moveBlock}
                                    duplicateBlock={duplicateBlock}
                                    movingBlockId={movingBlockId}
                                    addBlock={addBlock}
                                    totalBlocks={email.content.length}
                                />
                            ),
                        )}

                        {/* Last Block - Fixed */}
                        {last && (
                            <BlockWrapper
                                key={last.id}
                                block={last as Required<EmailBlock>}
                                index={email.content.length - 1}
                                isFirst={false}
                                isLast={true}
                                isFixed={true}
                                style={email.style}
                                blockRegistry={blockRegistry}
                                selectedBlockId={selectedBlockId}
                                setSelectedBlockId={setSelectedBlockId}
                                deleteBlock={deleteBlock}
                                moveBlock={moveBlock}
                                duplicateBlock={duplicateBlock}
                                movingBlockId={movingBlockId}
                                addBlock={addBlock}
                                totalBlocks={email.content.length}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Settings panel
    const settingsPanel = (
        <BlockSettingsPanel
            blockId={selectedBlockId}
            email={email}
            setSelectedBlockId={setSelectedBlockId}
            blockRegistry={blockRegistry}
            updateEmail={updateEmail}
            updateEmailStyle={updateEmailStyle}
            updateBlock={updateBlock}
        />
    );

    return (
        <EditorLayout
            editor={editorContent}
            settings={settingsPanel}
            showSettings={showSettings}
        />
    );
}
