import type { EmailBlock, EmailStyle } from "@/types/email-editor";
import type { LinkBlockSettings } from "./types";
import { Link, Section, Button } from "@react-email/components";

interface LinkBlockProps {
    block: EmailBlock & { settings: LinkBlockSettings };
    style?: EmailStyle;
}

export function LinkBlock({ block, style }: LinkBlockProps) {
    const {
        text = "Link Text",
        url = "#",
        alignment = "left",
        fontSize = block.settings.fontSize ||
            style?.typography.link.fontSize ||
            "16px",
        textDecoration = block.settings.textDecoration ||
            style?.typography.link.textDecoration ||
            "underline",
        isButton = false,
        textColor = style?.colors.accent,
        buttonColor = style?.colors.accent,
        buttonTextColor = style?.colors.accentForeground,
        buttonBorderRadius = "4px",
        buttonPaddingX = "16px",
        buttonPaddingY = "8px",
        buttonBorderWidth = "0px",
        buttonBorderStyle = "solid",
        buttonBorderColor = "#0284c7",
        backgroundColor = "transparent",
        // foregroundColor = style?.colors.accent || "#000000",
        paddingTop = style?.structure.section.padding?.y,
        paddingBottom = style?.structure.section.padding?.y,
    } = block.settings;

    // If it's a button, use the Button component
    if (isButton) {
        return (
            <Section>
                <div
                    style={{
                        paddingTop,
                        paddingBottom,
                        backgroundColor,
                        textAlign: alignment,
                    }}
                >
                    <Button
                        href={url}
                        style={{
                            backgroundColor:
                                buttonColor || style?.colors.accent,
                            color:
                                buttonTextColor ||
                                style?.colors.accentForeground,
                            borderRadius: buttonBorderRadius,
                            padding: `${buttonPaddingY} ${buttonPaddingX}`,
                            fontSize,
                            textDecoration: "none",
                            display: "inline-block",
                            textAlign: "center",
                            border:
                                buttonBorderWidth !== "0px"
                                    ? `${buttonBorderWidth} ${buttonBorderStyle} ${buttonBorderColor}`
                                    : "none",
                            fontFamily:
                                block.settings.fontFamily ||
                                style?.typography.link.fontFamily ||
                                "Arial, sans-serif",
                            lineHeight:
                                block.settings.lineHeight ||
                                style?.typography.link.lineHeight ||
                                "1.5",
                            maxWidth: "100%",
                        }}
                    >
                        {text}
                    </Button>
                </div>
            </Section>
        );
    }

    // Otherwise, use the Link component
    return (
        <Section>
            <div
                style={{
                    paddingTop,
                    paddingBottom,
                    backgroundColor,
                    textAlign: alignment,
                }}
            >
                <Link
                    href={url}
                    style={{
                        color: textColor,
                        fontSize,
                        textDecoration,
                        display: "inline-block", // Ensure the link is selectable even when empty
                        padding: "4px 0", // Add minimal padding to ensure the link is clickable
                        fontFamily:
                            block.settings.fontFamily ||
                            style?.typography.link.fontFamily ||
                            "Arial, sans-serif",
                        lineHeight:
                            block.settings.lineHeight ||
                            style?.typography.link.lineHeight ||
                            "1.5",
                    }}
                >
                    {text}
                </Link>
            </div>
        </Section>
    );
}
