import { useEmailEditor } from "@/context/email-editor-context";
import { Section, Markdown } from "@react-email/components";
import type { Content, Style } from "@/types/email-editor";
import type { TextBlockSettings } from "./types";

interface TextBlockProps {
    block: Content & { settings: TextBlockSettings };
    style?: Style;
}

export function TextBlock({ block, style }: TextBlockProps) {
    const { selectedBlockId } = useEmailEditor();
    const isSelected = selectedBlockId === block.id;

    // Get common block settings
    const {
        backgroundColor = "transparent",
        foregroundColor = style?.colors.foreground || "#000000",
        paddingTop = style?.structure.section.padding?.y,
        paddingBottom = style?.structure.section.padding?.y,
    } = block.settings;

    // Ensure there's always some content to make the block selectable
    const content =
        block.settings.content || (isSelected ? "" : "Text content");

    return (
        <Section>
            <div
                style={{
                    paddingTop,
                    paddingBottom,
                    backgroundColor,
                    color: foregroundColor,
                }}
            >
                <Markdown
                    markdownCustomStyles={{
                        h1: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 2, 32)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        h2: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.5, 24)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        h3: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.25, 20)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        h4: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.125, 18)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        h5: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.0625, 16)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        h6: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.03125, 14)}px`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.header.fontFamily ||
                                "Arial, sans-serif",
                        },
                        p: {
                            fontSize: `${block.settings.fontSize || style?.typography.text.fontSize || "16px"}`,
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.text.fontFamily ||
                                "Arial, sans-serif",
                            lineHeight:
                                block.settings.lineHeight ||
                                style?.typography.text.lineHeight ||
                                "1.5",
                            letterSpacing:
                                block.settings.letterSpacing ||
                                style?.typography.text.letterSpacing ||
                                "normal",
                            textTransform:
                                block.settings.textTransform ||
                                style?.typography.text.textTransform ||
                                "none",
                            textDecoration:
                                block.settings.textDecoration ||
                                style?.typography.text.textDecoration ||
                                "none",
                        },
                        link: {
                            color: style?.colors.accent || "inherit",
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.link.fontFamily ||
                                "Arial, sans-serif",
                            fontSize:
                                block.settings.fontSize ||
                                style?.typography.link.fontSize ||
                                "16px",
                            lineHeight:
                                block.settings.lineHeight ||
                                style?.typography.link.lineHeight ||
                                "1.5",
                            letterSpacing:
                                block.settings.letterSpacing ||
                                style?.typography.link.letterSpacing ||
                                "normal",
                            textTransform:
                                block.settings.textTransform ||
                                style?.typography.link.textTransform ||
                                "none",
                            textDecoration:
                                block.settings.textDecoration ||
                                style?.typography.link.textDecoration ||
                                "none",
                        },
                    }}
                    markdownContainerStyles={{
                        fontFamily:
                            block.settings.fontFamily || "Arial, sans-serif",
                        textAlign: block.settings.alignment || "left",
                        fontSize: block.settings.fontSize || "16px",
                        lineHeight: block.settings.lineHeight || "1.5",
                        paddingTop: paddingTop,
                        paddingBottom: paddingBottom,
                        padding: `${paddingTop} ${style?.structure.section.padding?.x} ${paddingBottom} ${style?.structure.section.padding?.x}`,
                    }}
                >
                    {content}
                </Markdown>
            </div>
        </Section>
    );
}
