import type { EmailBlock, EmailStyle } from "@/types/email-editor";
import type { LinkBlockSettings } from "./types";
import { SettingsInput } from "@/components/settings/settings-input";
import { SettingsSelect } from "@/components/settings/settings-select";
import { SettingsColorPicker } from "@/components/settings/settings-color-picker";
import { SettingsSlider } from "@/components/settings/settings-slider";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSwitch } from "@/components/settings/settings-switch";

interface LinkSettingsProps {
    block: Required<EmailBlock> & { settings: LinkBlockSettings };
    style?: EmailStyle;
    updateBlock: (id: string, content: Partial<EmailBlock>) => void;
}

export function LinkSettings({ block, style, updateBlock }: LinkSettingsProps) {
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
    const fontSize = pxToNumber(block.settings.fontSize, 16);
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
    ];

    // Alignment options
    const alignmentOptions = [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
    ];

    // Text decoration options
    const textDecorationOptions = [
        { value: "none", label: "None" },
        { value: "underline", label: "Underline" },
        { value: "overline", label: "Overline" },
        { value: "line-through", label: "Line Through" },
    ];

    return (
        <div className="space-y-4">
            <SettingsInput
                label="Link Text"
                value={block.settings.text || ""}
                onChange={(value) => handleSettingChange("text", value)}
                placeholder="Enter link text"
            />

            <SettingsInput
                label="URL"
                value={block.settings.url || ""}
                onChange={(value) => handleSettingChange("url", value)}
                placeholder="https://example.com"
            />

            <SettingsSelect
                label="Alignment"
                value={block.settings.alignment || "left"}
                onChange={(value) => handleSettingChange("alignment", value)}
                options={alignmentOptions}
                defaultValue="left"
            />

            <SettingsColorPicker
                label="Text Color"
                value={block.settings.textColor || "#0284c7"}
                onChange={(value) => handleSettingChange("textColor", value)}
                defaultValue="#0284c7"
            />

            <SettingsSelect
                label="Font Size"
                value={block.settings.fontSize || "16px"}
                onChange={(value) => handleSettingChange("fontSize", value)}
                options={fontSizeOptions}
                defaultValue="16px"
            />

            <SettingsSelect
                label="Text Decoration"
                value={block.settings.textDecoration || "underline"}
                onChange={(value) =>
                    handleSettingChange("textDecoration", value)
                }
                options={textDecorationOptions}
                defaultValue="underline"
            />

            <SettingsSwitch
                label="Button Style"
                checked={block.settings.isButton || false}
                onCheckedChange={(value) =>
                    handleSettingChange("isButton", value)
                }
            />

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
