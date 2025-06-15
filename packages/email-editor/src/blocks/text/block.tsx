import { useEmailEditor } from "@/context/email-editor-context";
import { Text, Section } from "@react-email/components";
import type { Content } from "@/types/email-editor";
import type { TextBlockSettings } from "./types";

interface TextBlockProps {
    block: Content & { settings: TextBlockSettings };
}

export function TextBlock({ block }: TextBlockProps) {
    const { selectedBlockId } = useEmailEditor();
    const isSelected = selectedBlockId === block.id;

    // Get common block settings
    const {
        backgroundColor = "transparent",
        foregroundColor = "#000000",
        paddingTop = "0px",
        paddingBottom = "0px",
    } = block.settings;

    // Apply any custom styling from settings
    const textStyle = {
        color: block.settings.textColor || foregroundColor,
        textAlign: block.settings.alignment || "left",
        fontFamily: block.settings.fontFamily || "Arial, sans-serif",
        fontSize: block.settings.fontSize || "16px",
        lineHeight: block.settings.lineHeight || "1.5",
        margin: "0",
    };

    // Section style
    const sectionStyle = {
        backgroundColor,
        color: foregroundColor,
        paddingTop,
        paddingBottom,
    };

    // Ensure there's always some content to make the block selectable
    const content =
        block.settings.content || (isSelected ? "" : "Text content");

    return (
        <Section style={sectionStyle}>
            <Text style={textStyle}>{content}</Text>
        </Section>
    );
}
