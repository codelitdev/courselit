import { useEmailEditor } from "@/context/email-editor-context";
import type { Content } from "@/types/email-editor";
import type { LinkBlockSettings } from "./types";
import { SettingsInput } from "@/components/settings/settings-input";
import { SettingsSelect } from "@/components/settings/settings-select";
import { SettingsColorPicker } from "@/components/settings/settings-color-picker";
import { SettingsSlider } from "@/components/settings/settings-slider";
import { SettingsSwitch } from "@/components/settings/settings-switch";
import { SettingsSection } from "@/components/settings/settings-section";

interface LinkSettingsProps {
    block: Required<Content> & { settings: LinkBlockSettings };
}

export function LinkSettings({ block }: LinkSettingsProps) {
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
    const paddingTop = pxToNumber(block.settings.paddingTop, 0);
    const paddingBottom = pxToNumber(block.settings.paddingBottom, 0);
    const buttonPaddingX = pxToNumber(block.settings.buttonPaddingX, 16);
    const buttonPaddingY = pxToNumber(block.settings.buttonPaddingY, 8);
    const buttonBorderRadius = pxToNumber(block.settings.buttonBorderRadius, 4);
    const buttonBorderWidth = pxToNumber(block.settings.buttonBorderWidth, 0);

    // Alignment options
    const alignmentOptions = [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
    ];

    // Font size options
    const fontSizeOptions = [
        { value: "12px", label: "12px" },
        { value: "14px", label: "14px" },
        { value: "16px", label: "16px" },
        { value: "18px", label: "18px" },
        { value: "20px", label: "20px" },
        { value: "24px", label: "24px" },
    ];

    // Text decoration options
    const textDecorationOptions = [
        { value: "underline", label: "Underline" },
        { value: "none", label: "None" },
        { value: "line-through", label: "Line Through" },
    ];

    // Border style options
    const borderStyleOptions = [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
    ];

    return (
        <div className="space-y-4">
            {/* Link Text */}
            <SettingsInput
                label={block.settings.isButton ? "Button Text" : "Link Text"}
                value={block.settings.text || ""}
                onChange={(value) => handleSettingChange("text", value)}
                placeholder={
                    block.settings.isButton
                        ? "Enter button text"
                        : "Enter link text"
                }
                defaultValue="Link Text"
            />

            {/* URL */}
            <SettingsInput
                label="URL"
                value={block.settings.url || "#"}
                onChange={(value) => handleSettingChange("url", value)}
                placeholder="https://example.com"
                defaultValue="#"
            />

            {/* Alignment */}
            <SettingsSelect
                label="Alignment"
                value={block.settings.alignment || "left"}
                onChange={(value) => handleSettingChange("alignment", value)}
                options={alignmentOptions}
                defaultValue="left"
            />

            {/* Button Mode Toggle */}
            <SettingsSwitch
                label="Display as Button"
                checked={block.settings.isButton || false}
                onCheckedChange={(checked) =>
                    handleSettingChange("isButton", checked)
                }
                defaultChecked={false}
            />

            {/* Button Settings */}
            {block.settings.isButton && (
                <SettingsSection title="Button Settings">
                    <SettingsColorPicker
                        label="Button Color"
                        value={block.settings.buttonColor || ""}
                        onChange={(value) =>
                            handleSettingChange("buttonColor", value)
                        }
                        defaultValue=""
                    />

                    <SettingsColorPicker
                        label="Button Text Color"
                        value={block.settings.buttonTextColor || ""}
                        onChange={(value) =>
                            handleSettingChange("buttonTextColor", value)
                        }
                        defaultValue=""
                    />

                    {/* Border Radius Slider */}
                    <SettingsSlider
                        label="Border Radius"
                        value={buttonBorderRadius}
                        onChange={(value) =>
                            handleSettingChange(
                                "buttonBorderRadius",
                                `${value}px`,
                            )
                        }
                        min={0}
                        max={50}
                        defaultValue={4}
                    />

                    {/* Padding Sliders */}
                    <SettingsSlider
                        label="Horizontal Padding"
                        value={buttonPaddingX}
                        onChange={(value) =>
                            handleSettingChange("buttonPaddingX", `${value}px`)
                        }
                        min={0}
                        max={100}
                        defaultValue={16}
                    />

                    <SettingsSlider
                        label="Vertical Padding"
                        value={buttonPaddingY}
                        onChange={(value) =>
                            handleSettingChange("buttonPaddingY", `${value}px`)
                        }
                        min={0}
                        max={50}
                        defaultValue={8}
                    />

                    {/* Button Border */}
                    <SettingsSection title="Border">
                        <SettingsSlider
                            label="Width"
                            value={buttonBorderWidth}
                            onChange={(value) =>
                                handleSettingChange(
                                    "buttonBorderWidth",
                                    `${value}px`,
                                )
                            }
                            min={0}
                            max={10}
                            defaultValue={0}
                        />

                        <SettingsSelect
                            label="Style"
                            value={block.settings.buttonBorderStyle || "solid"}
                            onChange={(value) =>
                                handleSettingChange("buttonBorderStyle", value)
                            }
                            options={borderStyleOptions}
                            defaultValue="solid"
                        />

                        <SettingsColorPicker
                            label="Color"
                            value={block.settings.buttonBorderColor || ""}
                            onChange={(value) =>
                                handleSettingChange("buttonBorderColor", value)
                            }
                            defaultValue=""
                        />
                    </SettingsSection>
                </SettingsSection>
            )}

            {/* Link Settings */}
            {!block.settings.isButton && (
                <SettingsSection title="Link Style">
                    <SettingsColorPicker
                        label="Text Color"
                        value={block.settings.textColor || ""}
                        onChange={(value) =>
                            handleSettingChange("textColor", value)
                        }
                        defaultValue=""
                    />

                    <SettingsSelect
                        label="Font Size"
                        value={block.settings.fontSize || "16px"}
                        onChange={(value) =>
                            handleSettingChange("fontSize", value)
                        }
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
                </SettingsSection>
            )}

            {/* Common Block Settings */}
            <SettingsSection title="Block Settings">
                <SettingsColorPicker
                    label="Background Color"
                    value={block.settings.backgroundColor || ""}
                    onChange={(value) =>
                        handleSettingChange("backgroundColor", value)
                    }
                    defaultValue=""
                />

                {/* <SettingsColorPicker
                    label="Foreground Color"
                    value={block.settings.foregroundColor || "#000000"}
                    onChange={(value) =>
                        handleSettingChange("foregroundColor", value)
                    }
                    defaultValue="#000000"
                /> */}

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
