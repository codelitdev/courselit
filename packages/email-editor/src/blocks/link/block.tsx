import type { Content } from "@/types/email-editor";
import type { LinkBlockSettings } from "./types";
import { Link, Section, Button } from "@react-email/components";

interface LinkBlockProps {
    block: Content & { settings: LinkBlockSettings };
}

export function LinkBlock({ block }: LinkBlockProps) {
    const {
        text = "Link Text",
        url = "#",
        alignment = "left",
        textColor = "#0284c7",
        fontSize = "16px",
        fontWeight = "400",
        textDecoration = "underline",
        isButton = false,
        buttonColor = "#0284c7",
        buttonTextColor = "#ffffff",
        buttonBorderRadius = "4px",
        buttonPaddingX = "16px",
        buttonPaddingY = "8px",
        buttonBorderWidth = "0px",
        buttonBorderStyle = "solid",
        buttonBorderColor = "#0284c7",
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    // Common section styles
    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
        textAlign: alignment,
    };

    // If it's a button, use the Button component
    if (isButton) {
        return (
            <Section style={sectionStyle}>
                <Button
                    href={url}
                    style={{
                        backgroundColor: buttonColor,
                        color: buttonTextColor,
                        borderRadius: buttonBorderRadius,
                        padding: `${buttonPaddingY} ${buttonPaddingX}`,
                        fontSize,
                        fontWeight,
                        textDecoration: "none",
                        display: "inline-block",
                        textAlign: "center",
                        border:
                            buttonBorderWidth !== "0px"
                                ? `${buttonBorderWidth} ${buttonBorderStyle} ${buttonBorderColor}`
                                : "none",
                        fontFamily: "sans-serif",
                        lineHeight: "100%",
                        maxWidth: "100%",
                    }}
                >
                    {text}
                </Button>
            </Section>
        );
    }

    // Otherwise, use the Link component
    return (
        <Section style={sectionStyle}>
            <Link
                href={url}
                style={{
                    color: textColor,
                    fontSize,
                    fontWeight,
                    textDecoration,
                    display: "inline-block", // Ensure the link is selectable even when empty
                    padding: "4px 0", // Add minimal padding to ensure the link is clickable
                }}
            >
                {text}
            </Link>
        </Section>
    );
}
