import type { EmailBlock, EmailStyle } from "@/types/email-editor";
import type { SeparatorBlockSettings } from "./types";
import { Hr, Section } from "@react-email/components";

interface SeparatorBlockProps {
    block: EmailBlock & { settings: SeparatorBlockSettings };
    style?: EmailStyle;
}

export function SeparatorBlock({ block, style }: SeparatorBlockProps) {
    const {
        color = style?.colors?.border,
        thickness = "1px",
        style: borderStyle = "solid",
        // Common block settings
        paddingTop = style?.structure?.section?.padding?.y,
        paddingBottom = style?.structure?.section?.padding?.y,
        backgroundColor = "transparent",
    } = block.settings;

    return (
        <Section>
            <div
                style={{
                    paddingTop,
                    paddingBottom,
                    backgroundColor,
                }}
            >
                <Hr
                    style={{
                        backgroundColor: "transparent",
                        borderTop: `${thickness} ${borderStyle} ${color}`,
                        marginTop: paddingTop,
                        marginBottom: paddingBottom,
                        width: "100%",
                    }}
                />
            </div>
        </Section>
    );
}
