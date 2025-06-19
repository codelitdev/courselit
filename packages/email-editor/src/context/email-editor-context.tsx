import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import type { Email, Content, Style } from "../types/email-editor";
import type { TextBlockSettings } from "../blocks/text/types";
import type { ImageBlockSettings } from "../blocks/image/types";
import type { SeparatorBlockSettings } from "../blocks/separator/types";
import type { LinkBlockSettings } from "../blocks/link/types";
import { defaultEmail } from "../lib/default-email";

interface EmailEditorContextType {
    email: Email;
    updateEmail: (email: Email) => void;
    updateEmailStyle: (style: Partial<Style>) => void;
    addBlock: (blockType: string, index: number) => void;
    updateBlock: (id: string, content: Partial<Content>) => void;
    deleteBlock: (id: string) => void;
    moveBlock: (id: string, direction: "up" | "down") => void;
    duplicateBlock: (id: string) => void;
    movingBlockId: string | null;
    selectedBlockId: string | null;
    setSelectedBlockId: (id: string | null) => void;
    updateBlockStyle: (id: string, style: Partial<Style>) => void;
}

interface EmailEditorProviderProps {
    children: ReactNode;
    initialEmail?: Email;
    onChange?: (email: Email) => void;
}

const EmailEditorContext = createContext<EmailEditorContextType | undefined>(
    undefined,
);

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
        })),
    };
}

function stripBlockIds(email: Email): Email {
    return {
        ...email,
        content: email.content.map((block) => ({ ...block, id: undefined })),
    };
}

export function EmailEditorProvider({
    children,
    initialEmail,
    onChange,
}: EmailEditorProviderProps) {
    const [email, setEmail] = useState<Email>(
        getEmailWithBlockIds(initialEmail || defaultEmail),
    );
    const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    // Update email when initialEmail prop changes
    useEffect(() => {
        if (initialEmail) {
            setEmail(initialEmail);
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
        (styleUpdate: Partial<Style>) => {
            setEmail((prevEmail) => {
                const newEmail = {
                    ...prevEmail,
                    style: deepMerge(prevEmail.style, styleUpdate),
                };

                if (onChange) {
                    onChange(newEmail);
                }

                return newEmail;
            });
        },
        [onChange],
    );

    const addBlock = useCallback(
        (blockType: string, index: number) => {
            const newBlock: Content = {
                id: generateId(),
                blockType,
                settings: getDefaultSettingsForBlockType(blockType),
            };

            const newEmail = {
                ...email,
                content: [
                    ...email.content.slice(0, index),
                    newBlock,
                    ...email.content.slice(index),
                ],
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(newEmail);
            }
        },
        [email, onChange],
    );

    const updateBlock = useCallback(
        (id: string, content: Partial<Content>) => {
            const newEmail = {
                ...email,
                content: email.content.map((block) =>
                    block.id === id ? { ...block, ...content } : block,
                ),
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(newEmail);
            }
        },
        [email, onChange],
    );

    const updateBlockStyle = useCallback(
        (id: string, style: Partial<Style>) => {
            const newEmail = {
                ...email,
                content: email.content.map((block) => {
                    if (block.id === id) {
                        return {
                            ...block,
                            style: {
                                ...(block.style || {}),
                                ...style,
                            },
                        };
                    }
                    return block;
                }),
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(newEmail);
            }
        },
        [email, onChange],
    );

    const deleteBlock = useCallback(
        (id: string) => {
            // Don't allow deleting if there's only one block left
            if (email.content.length <= 1) {
                return;
            }

            const newEmail = {
                ...email,
                content: email.content.filter((block) => block.id !== id),
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(newEmail);
            }

            // If the deleted block was selected, clear selection
            if (selectedBlockId === id) {
                setSelectedBlockId(null);
            }
        },
        [email, selectedBlockId, onChange],
    );

    const moveBlock = useCallback(
        (id: string, direction: "up" | "down") => {
            const index = email.content.findIndex((block) => block.id === id);
            if (
                (direction === "up" && index === 0) ||
                (direction === "down" && index === email.content.length - 1)
            ) {
                return;
            }

            // Set the moving block ID to trigger animation
            setMovingBlockId(id);

            // Delay the actual move to allow animation to start
            setTimeout(() => {
                const newContent = [...email.content];
                const [movedBlock] = newContent.splice(index, 1);
                newContent.splice(
                    direction === "up" ? index - 1 : index + 1,
                    0,
                    movedBlock,
                );

                const newEmail = {
                    ...email,
                    content: newContent,
                };

                setEmail(newEmail);

                if (onChange) {
                    onChange(newEmail);
                }

                // Clear the moving block ID after animation completes
                setTimeout(() => {
                    setMovingBlockId(null);
                }, 300);
            }, 50);
        },
        [email, onChange],
    );

    const duplicateBlock = useCallback(
        (id: string) => {
            const blockToDuplicate = email.content.find(
                (block) => block.id === id,
            );
            if (!blockToDuplicate) return;

            const index = email.content.findIndex((block) => block.id === id);
            const duplicatedBlock = {
                ...blockToDuplicate,
                id: generateId(),
            };

            const newContent = [...email.content];
            newContent.splice(index + 1, 0, duplicatedBlock);

            const newEmail = {
                ...email,
                content: newContent,
            };

            setEmail(newEmail);

            if (onChange) {
                onChange(newEmail);
            }
        },
        [email, onChange],
    );

    return (
        <EmailEditorContext.Provider
            value={{
                email,
                updateEmail,
                updateEmailStyle,
                addBlock,
                updateBlock,
                deleteBlock,
                moveBlock,
                duplicateBlock,
                movingBlockId,
                selectedBlockId,
                setSelectedBlockId,
                updateBlockStyle,
            }}
        >
            {children}
        </EmailEditorContext.Provider>
    );
}

export function useEmailEditor() {
    const context = useContext(EmailEditorContext);
    if (context === undefined) {
        throw new Error(
            "useEmailEditor must be used within an EmailEditorProvider",
        );
    }
    return context;
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
            } as TextBlockSettings;
        case "separator":
            return {
                ...commonSettings,
                color: "#e2e8f0",
                thickness: "1px",
                style: "solid",
                marginY: "16px",
            } as SeparatorBlockSettings;
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
            } as ImageBlockSettings;
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
            } as LinkBlockSettings;
        default:
            return {} as Record<string, any>;
    }
}
