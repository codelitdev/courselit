import type React from "react";

import type { Content } from "@/types/email-editor";
import type { TextBlockSettings } from "@/blocks/text/types";
import type { ImageBlockSettings } from "@/blocks/image/types";
import type { SeparatorBlockSettings } from "@/blocks/separator/types";
import type { LinkBlockSettings } from "@/blocks/link/types";
import { ImageIcon } from "lucide-react";
import { useEmailEditor } from "@/context/email-editor-context";

interface EditorBlockRendererProps {
    block: Content;
}

export function EditorBlockRenderer({ block }: EditorBlockRendererProps) {
    const { selectedBlockId } = useEmailEditor();
    const isSelected = selectedBlockId === block.id;

    switch (block.blockType) {
        case "text":
            return (
                <TextEditorBlock
                    block={block as Content & { settings: TextBlockSettings }}
                    isSelected={isSelected}
                />
            );
        case "image":
            return (
                <ImageEditorBlock
                    block={block as Content & { settings: ImageBlockSettings }}
                />
            );
        case "separator":
            return (
                <SeparatorEditorBlock
                    block={
                        block as Content & { settings: SeparatorBlockSettings }
                    }
                />
            );
        case "link":
            return (
                <LinkEditorBlock
                    block={block as Content & { settings: LinkBlockSettings }}
                />
            );
        default:
            return <div>Unknown block type: {block.blockType}</div>;
    }
}

// Text Editor Block
function TextEditorBlock({
    block,
    isSelected,
}: {
    block: Content & { settings: TextBlockSettings };
    isSelected: boolean;
}) {
    const {
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    const textStyle = {
        color: block.settings.textColor || foregroundColor,
        textAlign: block.settings.alignment || "left",
        fontFamily: block.settings.fontFamily || "Arial, sans-serif",
        fontSize: block.settings.fontSize || "16px",
        lineHeight: block.settings.lineHeight || "1.5",
        margin: "0",
    } as React.CSSProperties;

    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
    };

    const content =
        block.settings.content || (isSelected ? "" : "Text content");

    return (
        <div style={sectionStyle}>
            <p style={textStyle}>{content}</p>
        </div>
    );
}

// Image Editor Block
function ImageEditorBlock({
    block,
}: {
    block: Content & { settings: ImageBlockSettings };
}) {
    const {
        src = "",
        alt = "Image",
        alignment = "left",
        width = "auto",
        height = "auto",
        maxWidth = "100%",
        borderRadius = "0px",
        borderWidth,
        borderStyle = "solid",
        borderColor = "#e2e8f0",
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
        textAlign: alignment,
    } as React.CSSProperties;

    return (
        <div style={sectionStyle}>
            {src ? (
                <img
                    src={src || "/placeholder.svg"}
                    alt={alt}
                    style={{
                        width: width !== "auto" ? width : undefined,
                        height: height !== "auto" ? height : undefined,
                        maxWidth,
                        borderRadius,
                        border: borderWidth
                            ? `${borderWidth} ${borderStyle} ${borderColor}`
                            : "none",
                        display: "inline-block",
                    }}
                />
            ) : (
                <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50"
                    style={{
                        minHeight: "100px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div>
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                            Click to add an image
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Separator Editor Block
function SeparatorEditorBlock({
    block,
}: {
    block: Content & { settings: SeparatorBlockSettings };
}) {
    const {
        color = "#e2e8f0",
        thickness = "1px",
        marginY = "16px",
        style = "solid",
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
    };

    return (
        <div style={sectionStyle}>
            <hr
                style={{
                    borderColor: color,
                    borderWidth: thickness,
                    borderStyle: style,
                    margin: `${marginY} 0`,
                    width: "100%",
                }}
            />
        </div>
    );
}

// Link Editor Block
function LinkEditorBlock({
    block,
}: {
    block: Content & { settings: LinkBlockSettings };
}) {
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

    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
        textAlign: alignment,
    } as React.CSSProperties;

    if (isButton) {
        return (
            <div style={sectionStyle}>
                <a
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
                </a>
            </div>
        );
    }

    return (
        <div style={sectionStyle}>
            <a
                href={url}
                style={{
                    color: textColor,
                    fontSize,
                    fontWeight,
                    textDecoration,
                    display: "inline-block",
                    padding: "4px 0",
                }}
            >
                {text}
            </a>
        </div>
    );
}
