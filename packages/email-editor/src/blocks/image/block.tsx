import { EmailBlock } from "@/types/email-editor";
import type { ImageBlockSettings } from "./types";
import { Img, Section } from "@react-email/components";
import { ImageIcon } from "lucide-react";

interface ImageBlockProps {
    block: EmailBlock & { settings: ImageBlockSettings };
}

export function ImageBlock({ block }: ImageBlockProps) {
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
        // Common block settings
        backgroundColor = "transparent",
        // foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

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
                {src ? (
                    <Img
                        src={src}
                        alt={alt}
                        width={width !== "auto" ? width : undefined}
                        height={height !== "auto" ? height : undefined}
                        style={{
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
                                Select an image from the settings panel
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Section>
    );
}
