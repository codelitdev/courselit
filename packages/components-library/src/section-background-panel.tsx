import * as React from "react";
import {
    SectionBackground,
    BlendMode,
    BackgroundRepeat,
} from "@courselit/page-models";
import ColorSelector from "./color-selector";
import PageBuilderSlider from "./page-builder-slider";
import CustomSelect from "./select";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

interface SectionBackgroundPanelProps {
    value: SectionBackground;
    onChange: (value: SectionBackground) => void;
    className?: string;
}

const BLEND_MODES: { label: string; value: BlendMode }[] = [
    { label: "Normal", value: "normal" },
    { label: "Multiply", value: "multiply" },
    { label: "Screen", value: "screen" },
    { label: "Overlay", value: "overlay" },
    { label: "Darken", value: "darken" },
    { label: "Lighten", value: "lighten" },
    { label: "Color Dodge", value: "color-dodge" },
    { label: "Color Burn", value: "color-burn" },
    { label: "Hard Light", value: "hard-light" },
    { label: "Soft Light", value: "soft-light" },
    { label: "Difference", value: "difference" },
    { label: "Exclusion", value: "exclusion" },
    { label: "Hue", value: "hue" },
    { label: "Saturation", value: "saturation" },
    { label: "Color", value: "color" },
    { label: "Luminosity", value: "luminosity" },
];

const BACKGROUND_REPEAT_OPTIONS: { label: string; value: BackgroundRepeat }[] =
    [
        { label: "No Repeat", value: "no-repeat" },
        { label: "Repeat", value: "repeat" },
        { label: "Repeat X", value: "repeat-x" },
        { label: "Repeat Y", value: "repeat-y" },
        { label: "Space", value: "space" },
        { label: "Round", value: "round" },
    ];

const BACKGROUND_SIZE_OPTIONS = [
    { label: "Auto", value: "auto" },
    { label: "Cover", value: "cover" },
    { label: "Contain", value: "contain" },
    { label: "100%", value: "100%" },
    { label: "50%", value: "50%" },
    { label: "200%", value: "200%" },
];

const BACKGROUND_POSITION_OPTIONS = [
    { label: "Top Left", value: "top left" },
    { label: "Top Center", value: "top center" },
    { label: "Top Right", value: "top right" },
    { label: "Center Left", value: "center left" },
    { label: "Center", value: "center" },
    { label: "Center Right", value: "center right" },
    { label: "Bottom Left", value: "bottom left" },
    { label: "Bottom Center", value: "bottom center" },
    { label: "Bottom Right", value: "bottom right" },
];

export function SectionBackgroundPanel({
    value,
    onChange,
    className,
}: SectionBackgroundPanelProps) {
    const handleTypeChange = (type: SectionBackground["type"]) => {
        switch (type) {
            case "color":
                onChange({
                    type: "color",
                    backgroundColor: "#ffffff",
                    backgroundColorDark: undefined,
                });
                break;
            case "image":
                onChange({
                    type: "image",
                    overlay: {
                        color: "#000000",
                        blendMode: "normal",
                        opacity: 0.5,
                    },
                    image: {},
                    backgroundImage: "",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    maskImage: undefined,
                });
                break;
            case "gradient":
                onChange({
                    type: "gradient",
                    backgroundImage: "",
                    backgroundImageDark: undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    maskImage: undefined,
                });
                break;
        }
    };

    const handleColorBackgroundChange = (
        updates: Partial<Extract<SectionBackground, { type: "color" }>>,
    ) => {
        if (value.type === "color") {
            onChange({ ...value, ...updates });
        }
    };

    const handleImageBackgroundChange = (
        updates: Partial<Extract<SectionBackground, { type: "image" }>>,
    ) => {
        if (value.type === "image") {
            onChange({ ...value, ...updates });
        }
    };

    const handleGradientBackgroundChange = (
        updates: Partial<Extract<SectionBackground, { type: "gradient" }>>,
    ) => {
        if (value.type === "gradient") {
            onChange({ ...value, ...updates });
        }
    };

    const handleOverlayChange = (
        overlayUpdates: Partial<
            Extract<SectionBackground, { type: "image" }>["overlay"]
        >,
    ) => {
        if (value.type === "image") {
            onChange({
                ...value,
                overlay: { ...value.overlay, ...overlayUpdates },
            });
        }
    };

    return (
        <div className={className}>
            <Card>
                <CardHeader>
                    <CardTitle>Section Background</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Background Type Selection */}
                    <div className="space-y-2">
                        <Label>Background Type</Label>
                        <CustomSelect
                            title=""
                            value={value.type}
                            onChange={handleTypeChange}
                            options={[
                                { label: "Color", value: "color" },
                                { label: "Image", value: "image" },
                                { label: "Gradient", value: "gradient" },
                            ]}
                            variant="without-label"
                        />
                    </div>

                    <div className="h-[1px] w-full bg-border" />

                    {/* Color Background Controls */}
                    {value.type === "color" && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">
                                Color Settings
                            </h3>
                            <ColorSelector
                                title="Background Color"
                                value={value.backgroundColor}
                                onChange={(color) =>
                                    handleColorBackgroundChange({
                                        backgroundColor: color || "#ffffff",
                                    })
                                }
                                tooltip="Choose the background color for this section"
                            />
                            <ColorSelector
                                title="Dark Mode Color"
                                value={value.backgroundColorDark || ""}
                                onChange={(color) =>
                                    handleColorBackgroundChange({
                                        backgroundColorDark: color,
                                    })
                                }
                                tooltip="Optional background color for dark mode"
                                allowReset={true}
                            />
                        </div>
                    )}

                    {/* Image Background Controls */}
                    {value.type === "image" && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">
                                Image Settings
                            </h3>

                            {/* Image URL */}
                            <div className="space-y-2">
                                <Label htmlFor="background-image">
                                    Background Image URL
                                </Label>
                                <Input
                                    id="background-image"
                                    value={value.backgroundImage}
                                    onChange={(e) =>
                                        handleImageBackgroundChange({
                                            backgroundImage: e.target.value,
                                        })
                                    }
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* Image Properties */}
                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    title="Background Size"
                                    value={value.backgroundSize || "cover"}
                                    onChange={(size) =>
                                        handleImageBackgroundChange({
                                            backgroundSize: size,
                                        })
                                    }
                                    options={BACKGROUND_SIZE_OPTIONS}
                                />
                                <CustomSelect
                                    title="Background Position"
                                    value={value.backgroundPosition || "center"}
                                    onChange={(position) =>
                                        handleImageBackgroundChange({
                                            backgroundPosition: position,
                                        })
                                    }
                                    options={BACKGROUND_POSITION_OPTIONS}
                                />
                            </div>

                            <CustomSelect
                                title="Background Repeat"
                                value={value.backgroundRepeat || "no-repeat"}
                                onChange={(repeat) =>
                                    handleImageBackgroundChange({
                                        backgroundRepeat:
                                            repeat as BackgroundRepeat,
                                    })
                                }
                                options={BACKGROUND_REPEAT_OPTIONS}
                            />

                            {/* Mask Image */}
                            <div className="space-y-2">
                                <Label htmlFor="mask-image">
                                    Mask Image URL (Optional)
                                </Label>
                                <Input
                                    id="mask-image"
                                    value={value.maskImage || ""}
                                    onChange={(e) =>
                                        handleImageBackgroundChange({
                                            maskImage:
                                                e.target.value || undefined,
                                        })
                                    }
                                    placeholder="https://example.com/mask.svg"
                                />
                            </div>

                            <div className="h-[1px] w-full bg-border" />

                            {/* Overlay Settings */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">
                                    Overlay Settings
                                </h4>
                                <ColorSelector
                                    title="Overlay Color"
                                    value={value.overlay.color}
                                    onChange={(color) =>
                                        handleOverlayChange({
                                            color: color || "#000000",
                                        })
                                    }
                                    tooltip="Color of the overlay on top of the background image"
                                />
                                <CustomSelect
                                    title="Blend Mode"
                                    value={value.overlay.blendMode}
                                    onChange={(mode) =>
                                        handleOverlayChange({
                                            blendMode: mode as BlendMode,
                                        })
                                    }
                                    options={BLEND_MODES}
                                />
                                <PageBuilderSlider
                                    title="Overlay Opacity"
                                    min={0}
                                    max={100}
                                    value={Math.round(
                                        value.overlay.opacity * 100,
                                    )}
                                    onChange={(opacity) =>
                                        handleOverlayChange({
                                            opacity: (opacity || 0) / 100,
                                        })
                                    }
                                    tooltip="Opacity of the overlay (0-100%)"
                                />
                            </div>
                        </div>
                    )}

                    {/* Gradient Background Controls */}
                    {value.type === "gradient" && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">
                                Gradient Settings
                            </h3>

                            {/* Gradient CSS */}
                            <div className="space-y-2">
                                <Label htmlFor="gradient-css">
                                    Gradient CSS
                                </Label>
                                <Input
                                    id="gradient-css"
                                    value={value.backgroundImage}
                                    onChange={(e) =>
                                        handleGradientBackgroundChange({
                                            backgroundImage: e.target.value,
                                        })
                                    }
                                    placeholder="linear-gradient(45deg, #ff0000, #0000ff)"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter CSS gradient syntax (e.g.,
                                    linear-gradient, radial-gradient)
                                </p>
                            </div>

                            {/* Dark Mode Gradient */}
                            <div className="space-y-2">
                                <Label htmlFor="gradient-css-dark">
                                    Dark Mode Gradient (Optional)
                                </Label>
                                <Input
                                    id="gradient-css-dark"
                                    value={value.backgroundImageDark || ""}
                                    onChange={(e) =>
                                        handleGradientBackgroundChange({
                                            backgroundImageDark:
                                                e.target.value || undefined,
                                        })
                                    }
                                    placeholder="linear-gradient(45deg, #333333, #666666)"
                                />
                            </div>

                            {/* Gradient Properties */}
                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    title="Background Size"
                                    value={value.backgroundSize || "cover"}
                                    onChange={(size) =>
                                        handleGradientBackgroundChange({
                                            backgroundSize: size,
                                        })
                                    }
                                    options={BACKGROUND_SIZE_OPTIONS}
                                />
                                <CustomSelect
                                    title="Background Position"
                                    value={value.backgroundPosition || "center"}
                                    onChange={(position) =>
                                        handleGradientBackgroundChange({
                                            backgroundPosition: position,
                                        })
                                    }
                                    options={BACKGROUND_POSITION_OPTIONS}
                                />
                            </div>

                            <CustomSelect
                                title="Background Repeat"
                                value={value.backgroundRepeat || "no-repeat"}
                                onChange={(repeat) =>
                                    handleGradientBackgroundChange({
                                        backgroundRepeat:
                                            repeat as BackgroundRepeat,
                                    })
                                }
                                options={BACKGROUND_REPEAT_OPTIONS}
                            />

                            {/* Mask Image */}
                            <div className="space-y-2">
                                <Label htmlFor="gradient-mask-image">
                                    Mask Image URL (Optional)
                                </Label>
                                <Input
                                    id="gradient-mask-image"
                                    value={value.maskImage || ""}
                                    onChange={(e) =>
                                        handleGradientBackgroundChange({
                                            maskImage:
                                                e.target.value || undefined,
                                        })
                                    }
                                    placeholder="https://example.com/mask.svg"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
