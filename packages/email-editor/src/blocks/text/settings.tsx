import type { EmailBlock, EmailStyle } from "@/types/email-editor";
import type { TextBlockSettings } from "./types";
import { SettingsTextarea } from "@/components/settings/settings-textarea";
import { SettingsSelect } from "@/components/settings/settings-select";
import { SettingsColorPicker } from "@/components/settings/settings-color-picker";
import { SettingsSlider } from "@/components/settings/settings-slider";
import { SettingsSection } from "@/components/settings/settings-section";

interface TextSettingsProps {
    block: Required<EmailBlock> & { settings: TextBlockSettings };
    style?: EmailStyle;
    updateBlock: (id: string, content: Partial<EmailBlock>) => void;
}

export function TextSettings({ block, style, updateBlock }: TextSettingsProps) {
    const handleSettingChange = (key: string, value: any) => {
        updateBlock(block.id, {
            settings: {
                ...block.settings,
                [key]: value,
            },
        });
    };

    // Helper function to convert px string to number
    const pxToNumber = (
        value: string | undefined,
        defaultValue: number,
    ): number => {
        if (!value) return defaultValue;
        const match = value.match(/^(\d+)px$/);
        return match ? Number.parseInt(match[1], 10) : defaultValue;
    };

    // Get numeric values from settings
    const paddingTop = pxToNumber(block.settings.paddingTop, 0);
    const paddingBottom = pxToNumber(block.settings.paddingBottom, 0);

    // Font size options
    const fontSizeOptions = [
        { value: "12px", label: "12px" },
        { value: "14px", label: "14px" },
        { value: "16px", label: "16px" },
        { value: "18px", label: "18px" },
        { value: "20px", label: "20px" },
        { value: "24px", label: "24px" },
        { value: "28px", label: "28px" },
        { value: "32px", label: "32px" },
        { value: "36px", label: "36px" },
        { value: "42px", label: "42px" },
        { value: "48px", label: "48px" },
    ];

    // Font family options
    const fontFamilyOptions = [
        { value: "Arial, sans-serif", label: "Arial" },
        { value: "Helvetica, sans-serif", label: "Helvetica" },
        { value: "Georgia, serif", label: "Georgia" },
        { value: "'Times New Roman', serif", label: "Times New Roman" },
        { value: "Verdana, sans-serif", label: "Verdana" },
        { value: "monospace", label: "Monospace" },
    ];

    // Line height options
    const lineHeightOptions = [
        { value: "1", label: "1" },
        { value: "1.2", label: "1.2" },
        { value: "1.5", label: "1.5" },
        { value: "1.8", label: "1.8" },
        { value: "2", label: "2" },
    ];

    // Alignment options
    const alignmentOptions = [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "justify", label: "Justify" },
    ];

    return (
        <div className="space-y-4">
            <SettingsTextarea
                label="Text Content"
                value={block.settings.content || ""}
                onChange={(value) => handleSettingChange("content", value)}
                placeholder="Enter your text here"
                rows={5}
            />

            <SettingsSelect
                label="Text Alignment"
                value={block.settings.alignment || "left"}
                onChange={(value) => handleSettingChange("alignment", value)}
                options={alignmentOptions}
                defaultValue="left"
            />

            <SettingsSelect
                label="Font Family"
                value={block.settings.fontFamily || ""}
                onChange={(value) => handleSettingChange("fontFamily", value)}
                options={fontFamilyOptions}
                defaultValue=""
            />

            <SettingsSelect
                label="Font Size"
                value={block.settings.fontSize || "16px"}
                onChange={(value) => handleSettingChange("fontSize", value)}
                options={fontSizeOptions}
                defaultValue="16px"
            />

            <SettingsSelect
                label="Line Height"
                value={block.settings.lineHeight || "1.5"}
                onChange={(value) => handleSettingChange("lineHeight", value)}
                options={lineHeightOptions}
                defaultValue="1.5"
            />

            {/* <SettingsColorPicker
                label="Text Color"
                value={block.settings.textColor || "#000000"}
                onChange={(value) => handleSettingChange("textColor", value)}
                defaultValue="#000000"
            /> */}

            {/* Common Block Settings */}
            <SettingsSection title="Block Settings">
                <SettingsColorPicker
                    label="Background Color"
                    value={block.settings.backgroundColor || "transparent"}
                    onChange={(value) =>
                        handleSettingChange("backgroundColor", value)
                    }
                    defaultValue="transparent"
                />

                <SettingsColorPicker
                    label="Foreground Color"
                    value={block.settings.foregroundColor || "#000000"}
                    onChange={(value) =>
                        handleSettingChange("foregroundColor", value)
                    }
                    defaultValue="#000000"
                />

                <SettingsSlider
                    label="Padding Top"
                    value={pxToNumber(
                        block.settings.paddingTop ||
                            style?.structure.section.padding?.y,
                        16,
                    )}
                    onChange={(value) =>
                        handleSettingChange("paddingTop", `${value}px`)
                    }
                    min={0}
                    max={100}
                    defaultValue={pxToNumber(
                        style?.structure.section.padding?.y,
                        16,
                    )}
                />

                <SettingsSlider
                    label="Padding Bottom"
                    value={pxToNumber(
                        block.settings.paddingBottom ||
                            style?.structure.section.padding?.y,
                        16,
                    )}
                    onChange={(value) =>
                        handleSettingChange("paddingBottom", `${value}px`)
                    }
                    min={0}
                    max={100}
                    defaultValue={pxToNumber(
                        style?.structure.section.padding?.y,
                        16,
                    )}
                />
            </SettingsSection>
        </div>
    );
}
