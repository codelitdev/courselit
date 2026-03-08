import { Section, Markdown } from "@react-email/components";
import type { EmailBlock, EmailStyle } from "@/types/email-editor";
import type { TextBlockSettings } from "./types";

interface TextBlockProps {
    block: EmailBlock & { settings: TextBlockSettings };
    style?: EmailStyle;
    selectedBlockId?: string | null;
}

export function TextBlock({ block, style, selectedBlockId }: TextBlockProps) {
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

    // Common text styles to avoid repetition
    const commonTextStyles = {
        fontFamily:
            block.settings.fontFamily ||
            style?.typography.text.fontFamily ||
            "Arial, sans-serif",
        fontSize:
            block.settings.fontSize ||
            style?.typography.text.fontSize ||
            "16px",
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
    };

    const headerFontFamily =
        block.settings.fontFamily ||
        style?.typography.header.fontFamily ||
        "Arial, sans-serif";

    return (
        <Section>
            <div
                style={{
                    backgroundColor,
                    color: foregroundColor,
                    padding: `${paddingTop} ${style?.structure.section.padding?.x} ${paddingBottom} ${style?.structure.section.padding?.x}`,
                }}
            >
                <Markdown
                    markdownCustomStyles={{
                        h1: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 2, 32)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        h2: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.5, 24)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        h3: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.25, 20)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        h4: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.125, 18)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        h5: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.0625, 16)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        h6: {
                            fontWeight: "bold",
                            fontSize: `${Math.max(parseInt(block.settings.fontSize || "16") * 1.03125, 14)}px`,
                            fontFamily: headerFontFamily,
                            margin: "16px 0 8px",
                        },
                        p: {
                            ...commonTextStyles,
                            margin: "0 0 16px",
                        },
                        ul: {
                            ...commonTextStyles,
                            margin: "0 0 16px",
                            paddingLeft: "24px",
                            listStyleType: "disc",
                        },
                        ol: {
                            ...commonTextStyles,
                            margin: "0 0 16px",
                            paddingLeft: "24px",
                            listStyleType: "decimal",
                        },
                        li: {
                            ...commonTextStyles,
                            margin: "4px 0",
                        },
                        link: {
                            ...commonTextStyles,
                            color: style?.colors.accent || "inherit",
                        },
                    }}
                    markdownContainerStyles={{
                        fontFamily:
                            block.settings.fontFamily || "Arial, sans-serif",
                        textAlign: block.settings.alignment || "left",
                        fontSize: block.settings.fontSize || "16px",
                        lineHeight: block.settings.lineHeight || "1.5",
                    }}
                >
                    {content}
                </Markdown>
            </div>
        </Section>
    );
}
