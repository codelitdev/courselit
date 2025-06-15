"use client";

import { useEmailEditor } from "@/context/email-editor-context";
import type { Content } from "@/types/email-editor";
import type { SeparatorBlockSettings } from "./types";
import { SettingsColorPicker } from "@/components/settings/settings-color-picker";
import { SettingsSlider } from "@/components/settings/settings-slider";
import { SettingsSelect } from "@/components/settings/settings-select";
import { SettingsSection } from "@/components/settings/settings-section";

interface SeparatorSettingsProps {
    block: Content & { settings: SeparatorBlockSettings };
}

export function SeparatorSettings({ block }: SeparatorSettingsProps) {
    const { updateBlock } = useEmailEditor();

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
    const thickness = pxToNumber(block.settings.thickness, 1);
    const marginY = pxToNumber(block.settings.marginY, 16);
    const paddingTop = pxToNumber(block.settings.paddingTop, 0);
    const paddingBottom = pxToNumber(block.settings.paddingBottom, 0);

    // Style options
    const styleOptions = [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
        { value: "double", label: "Double" },
    ];

    return (
        <div className="space-y-4">
            <SettingsColorPicker
                label="Color"
                value={block.settings.color || "#e2e8f0"}
                onChange={(value) => handleSettingChange("color", value)}
                defaultValue="#e2e8f0"
            />

            <SettingsSlider
                label="Thickness"
                value={thickness}
                onChange={(value) =>
                    handleSettingChange("thickness", `${value}px`)
                }
                min={1}
                max={20}
                defaultValue={1}
            />

            <SettingsSelect
                label="Style"
                value={block.settings.style || "solid"}
                onChange={(value) => handleSettingChange("style", value)}
                options={styleOptions}
                defaultValue="solid"
            />

            <SettingsSlider
                label="Vertical Margin"
                value={marginY}
                onChange={(value) =>
                    handleSettingChange("marginY", `${value}px`)
                }
                min={0}
                max={100}
                defaultValue={16}
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
                    value={paddingTop}
                    onChange={(value) =>
                        handleSettingChange("paddingTop", `${value}px`)
                    }
                    min={0}
                    max={100}
                    defaultValue={0}
                />

                <SettingsSlider
                    label="Padding Bottom"
                    value={paddingBottom}
                    onChange={(value) =>
                        handleSettingChange("paddingBottom", `${value}px`)
                    }
                    min={0}
                    max={100}
                    defaultValue={0}
                />
            </SettingsSection>
        </div>
    );
}
