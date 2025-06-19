import { useEmailEditor } from "@/context/email-editor-context";
import { SettingsColorPicker } from "@/components/settings/settings-color-picker";
import { SettingsSelect } from "@/components/settings/settings-select";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSlider } from "@/components/settings/settings-slider";
import { SettingsInput } from "@/components/settings/settings-input";

export function EmailSettings() {
    const { email, updateEmailStyle, updateEmail } = useEmailEditor();

    const handleStyleChange = (path: string[], value: any) => {
        // Create a nested update based on the path
        const update: any = {};
        let current = update;

        // Build the nested structure
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = {};
            current = current[path[i]];
        }

        // Set the final value
        current[path[path.length - 1]] = value;

        updateEmailStyle(update);
    };

    const handleMetaChange = (field: string, value: any) => {
        updateEmail({
            ...email,
            meta: {
                ...email.meta,
                [field]: value,
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

    // Font family options
    const fontFamilyOptions = [
        { value: "Arial, sans-serif", label: "Arial" },
        { value: "Helvetica, sans-serif", label: "Helvetica" },
        { value: "Georgia, serif", label: "Georgia" },
        { value: "'Times New Roman', serif", label: "Times New Roman" },
        { value: "Verdana, sans-serif", label: "Verdana" },
        { value: "monospace", label: "Monospace" },
    ];

    // Ensure meta object exists with defaults
    const meta = email.meta || {};

    return (
        <div className="space-y-4">
            <SettingsSection title="Email Meta">
                <SettingsInput
                    label="Preview Text"
                    value={meta.previewText || ""}
                    onChange={(value) => handleMetaChange("previewText", value)}
                    placeholder="Enter preview text that appears in email clients"
                />
            </SettingsSection>

            <SettingsSection title="Colors">
                <SettingsColorPicker
                    label="Background"
                    value={email.style.colors.background}
                    onChange={(value) =>
                        handleStyleChange(["colors", "background"], value)
                    }
                    defaultValue="#ffffff"
                />

                <SettingsColorPicker
                    label="Foreground"
                    value={email.style.colors.foreground}
                    onChange={(value) =>
                        handleStyleChange(["colors", "foreground"], value)
                    }
                    defaultValue="#000000"
                />

                <SettingsColorPicker
                    label="Border"
                    value={email.style.colors.border}
                    onChange={(value) =>
                        handleStyleChange(["colors", "border"], value)
                    }
                    defaultValue="#e2e8f0"
                />

                <SettingsColorPicker
                    label="Accent"
                    value={email.style.colors.accent}
                    onChange={(value) =>
                        handleStyleChange(["colors", "accent"], value)
                    }
                    defaultValue="#0284c7"
                />

                <SettingsColorPicker
                    label="Accent Foreground"
                    value={email.style.colors.accentForeground}
                    onChange={(value) =>
                        handleStyleChange(["colors", "accentForeground"], value)
                    }
                    defaultValue="#ffffff"
                />
            </SettingsSection>

            <SettingsSection title="Typography">
                <SettingsSelect
                    label="Text Font Family"
                    value={
                        email.style.typography.text.fontFamily ||
                        "Arial, sans-serif"
                    }
                    onChange={(value) =>
                        handleStyleChange(
                            ["typography", "text", "fontFamily"],
                            value,
                        )
                    }
                    options={fontFamilyOptions}
                    defaultValue="Arial, sans-serif"
                />

                <SettingsSelect
                    label="Header Font Family"
                    value={
                        email.style.typography.header.fontFamily ||
                        "Arial, sans-serif"
                    }
                    onChange={(value) =>
                        handleStyleChange(
                            ["typography", "header", "fontFamily"],
                            value,
                        )
                    }
                    options={fontFamilyOptions}
                    defaultValue="Arial, sans-serif"
                />

                <SettingsSelect
                    label="Link Font Family"
                    value={
                        email.style.typography.link.fontFamily ||
                        "Arial, sans-serif"
                    }
                    onChange={(value) =>
                        handleStyleChange(
                            ["typography", "link", "fontFamily"],
                            value,
                        )
                    }
                    options={fontFamilyOptions}
                    defaultValue="Arial, sans-serif"
                />
            </SettingsSection>

            <SettingsSection title="Page Structure">
                <SettingsColorPicker
                    label="Page Background"
                    value={email.style.structure.page.background || "#f8fafc"}
                    onChange={(value) =>
                        handleStyleChange(
                            ["structure", "page", "background"],
                            value,
                        )
                    }
                    defaultValue="#f8fafc"
                />

                <SettingsSlider
                    label="Page Width"
                    value={pxToNumber(email.style.structure.page.width, 600)}
                    onChange={(value) =>
                        handleStyleChange(
                            ["structure", "page", "width"],
                            `${value}px`,
                        )
                    }
                    min={300}
                    max={800}
                    defaultValue={600}
                    tooltip="Width of the email container (300px - 800px)"
                />

                <SettingsSlider
                    label="Page Margin Y"
                    value={pxToNumber(email.style.structure.page.marginY, 20)}
                    onChange={(value) =>
                        handleStyleChange(
                            ["structure", "page", "marginY"],
                            `${value}px`,
                        )
                    }
                    min={0}
                    max={100}
                    defaultValue={20}
                    tooltip="Vertical margin around the email (0px - 100px)"
                />

                <SettingsSlider
                    label="Section Padding X"
                    value={pxToNumber(
                        email.style.structure.section.padding?.x,
                        24,
                    )}
                    onChange={(value) =>
                        handleStyleChange(
                            ["structure", "section", "padding", "x"],
                            `${value}px`,
                        )
                    }
                    min={0}
                    max={100}
                    defaultValue={24}
                    tooltip="Horizontal padding for email sections"
                />

                <SettingsSlider
                    label="Section Padding Y"
                    value={pxToNumber(
                        email.style.structure.section.padding?.y,
                        16,
                    )}
                    onChange={(value) =>
                        handleStyleChange(
                            ["structure", "section", "padding", "y"],
                            `${value}px`,
                        )
                    }
                    min={0}
                    max={100}
                    defaultValue={16}
                    tooltip="Vertical padding for email sections"
                />
            </SettingsSection>
        </div>
    );
}
