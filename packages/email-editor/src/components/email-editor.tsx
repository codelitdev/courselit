import { useState } from "react";
import { useEmailEditor } from "@/context/email-editor-context";
import { BlockWrapper } from "./block-wrapper";
import { AddBlockButton } from "./add-block-button";
import { BlockSettingsPanel } from "./block-settings-panel";
import { EditorLayout } from "./layout/editor-layout";
import type { Content } from "../types/email-editor";
import "../index.css";

export function EmailEditor() {
    const { email, selectedBlockId } = useEmailEditor();
    const [showSettings, setShowSettings] = useState(true);

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
                            <AddBlockButton position="below" index={0} />
                        </div>
                    )}

                    <div>
                        {/* First Block - Fixed */}
                        {first && (
                            <BlockWrapper
                                key={first.id}
                                block={first as Required<Content>}
                                index={0}
                                isFirst={true}
                                isLast={false}
                                isFixed={true}
                                style={email.style}
                            />
                        )}

                        {/* Middle Blocks - Movable */}
                        {middleBlocks.map((block: Content, index: number) => (
                            <BlockWrapper
                                key={block.id}
                                block={block as Required<Content>}
                                index={index + 1}
                                isFirst={false}
                                isLast={false}
                                isFixed={false}
                                style={email.style}
                            />
                        ))}

                        {/* Last Block - Fixed */}
                        {last && (
                            <BlockWrapper
                                key={last.id}
                                block={last as Required<Content>}
                                index={email.content.length - 1}
                                isFirst={false}
                                isLast={true}
                                isFixed={true}
                                style={email.style}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Settings panel
    const settingsPanel = <BlockSettingsPanel blockId={selectedBlockId} />;

    return (
        <EditorLayout
            editor={editorContent}
            settings={settingsPanel}
            showSettings={showSettings}
        />
    );
}
