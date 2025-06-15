"use client";

import type { Content } from "@/types/email-editor";
import type { SeparatorBlockSettings } from "./types";
import { Hr, Section } from "@react-email/components";

interface SeparatorBlockProps {
    block: Content & { settings: SeparatorBlockSettings };
}

export function SeparatorBlock({ block }: SeparatorBlockProps) {
    const {
        color = "#e2e8f0",
        thickness = "1px",
        marginY = "16px",
        style = "solid",
        // Common block settings
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    // Section style
    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
    };

    return (
        <Section style={sectionStyle}>
            <Hr
                style={{
                    borderColor: color,
                    borderWidth: thickness,
                    borderStyle: style,
                    margin: `${marginY} 0`,
                    width: "100%",
                }}
            />
        </Section>
    );
}
